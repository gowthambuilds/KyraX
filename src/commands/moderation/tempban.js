import { KyraUI } from '#classes/KyraUI';
import { PermissionFlagsBits } from 'discord.js';
import { modLogger } from '#utils/modLogger';
import ms from 'ms';

export default {
    name: 'tempban',
    description: 'Temporarily bans a member from the server',
    slash: true,
    options: [
        { name: 'user', description: 'The user to ban', type: 6, required: true },
        { name: 'duration', description: 'Duration of the ban (e.g. 1h, 7d)', type: 3, required: true },
        { name: 'reason', description: 'Reason for the ban', type: 3, required: false }
    ],
    async execute({ client, message, interaction, args }) {
        const isSlash = !!interaction;
        if (isSlash) await interaction.deferReply({ flags: KyraUI.getFlags() });

        const executor = isSlash ? interaction.member : message.member;
        const guild = isSlash ? interaction.guild : message.guild;

        // 1. Resolve Target
        const targetUser = isSlash
            ? interaction.options.getUser('user')
            : message.mentions.users.filter(u => message.content.includes(u.id)).first();

        if (!targetUser) {
            return KyraUI.sendUsage({ client, message, interaction }, isSlash ? '/tempban user: <user> duration: <duration> [reason: reason]' : `${client.prefix}tempban <@user> <duration> [reason]`);
        }

        // 2. Resolve Duration and Reason
        const durationStr = isSlash ? interaction.options.getString('duration') : args[1];
        const reason = isSlash ? interaction.options.getString('reason') : args.slice(2).join(' ');
        const finalReason = reason || 'No reason provided';

        if (!durationStr) {
            return KyraUI.sendUsage({ client, message, interaction }, isSlash ? '/tempban user: <user> duration: <duration> [reason: reason]' : `${client.prefix}tempban <@user> <duration> [reason]`);
        }

        const durationMs = ms(durationStr);
        if (!durationMs || durationMs < 10000) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Invalid duration. Minimum is 10 seconds.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        // 3. Permission Checks (Executor)
        if (!executor.permissions.has(PermissionFlagsBits.BanMembers)) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You need **Ban Members** permissions.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        // 4. Permission Checks (Bot)
        if (!guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} I need **Ban Members** permissions.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        // 5. Hierarchy Checks
        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
        if (targetMember) {
            if (targetMember.id === executor.id) {
                const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You cannot ban yourself.`);
                return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
            }

            if (targetMember.id === guild.ownerId) {
                const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You cannot ban the server owner.`);
                return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
            }

            if (targetMember.roles.highest.position >= executor.roles.highest.position && executor.id !== guild.ownerId) {
                const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You cannot ban this user due to role hierarchy.`);
                return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
            }

            if (!targetMember.bannable) {
                const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} I cannot ban this user. They might have a higher role than me.`);
                return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
            }
        }

        // 6. Action (Ultrafast Execution)
        try {
            // Background Operations
            (async () => {
                // Logging
                modLogger.log(client, {
                    guild,
                    user: targetUser,
                    moderator: executor.user,
                    type: 'ban',
                    reason: `[Tempban: ${durationStr}] ${finalReason}`,
                    duration: durationStr
                }).catch(() => { });

                // Register Tempban Timer
                try {
                    const { Timer } = await import('#src/database/index.js');
                    const endTime = Date.now() + durationMs;
                    const timerDoc = await Timer.create({
                        userId: targetUser.id,
                        guildId: guild.id,
                        channelId: isSlash ? interaction.channelId : message.channel.id,
                        type: 'TEMPBAN',
                        message: 'Temporary Ban Expiration',
                        duration: durationMs,
                        expiresAt: new Date(endTime),
                        completed: false
                    });

                    // Schedule unban
                    setTimeout(async () => {
                        const refreshedTimer = await Timer.findOne({ _id: timerDoc._id, completed: false });
                        if (refreshedTimer) {
                            await Timer.updateOne({ _id: timerDoc._id }, { completed: true });
                            await guild.members.unban(targetUser.id, 'Temporary ban expired').catch(() => null);

                            const channel = isSlash ? interaction.channel : message.channel;
                            if (channel) {
                                const expireMsg = `${client.config.emojis.success} **Tempban Expired:** <@${targetUser.id}> has been unbanned.`;
                                await channel.send({ content: expireMsg }).catch(() => { });
                            }

                            const dmContainer = KyraUI.buildDashboard(
                                `### 🛡️ **Ban Expired**`,
                                `Your temporary ban in **${guild.name}** has expired.\n\n` +
                                `${client.config.emojis.dot} You have been unbanned and can rejoin the server.`
                            );
                            await targetUser.send({ components: dmContainer }).catch(() => { });
                        }
                    }, durationMs);
                } catch (e) { }
            })();

            // Perform core action immediately
            await guild.members.ban(targetUser.id, { reason: `${executor.user.tag} (Tempban: ${durationStr}): ${finalReason}` });

            // Reply instantly
            const successContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.success} **${targetUser.tag}** has been temporarily banned for **${durationStr}**.\n${client.config.emojis.dot} **Reason:** ${finalReason}`);
            return isSlash ? interaction.editReply({ components: successContainer }) : message.reply({ components: successContainer, flags: KyraUI.getFlags() });
        } catch (error) {
            client.logger.error('Tempban', 'Failed to ban user', error);
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} An error occurred while trying to ban this user.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }
    }
};

