import { KyraUI } from '#classes/KyraUI';
import { PermissionFlagsBits } from 'discord.js';
import { modLogger } from '#utils/modLogger';
import ms from 'ms';

export default {
    name: 'timeout',
    description: 'Times out a member in the server',
    aliases: ['mute'],
    slash: true,
    options: [
        { name: 'user', description: 'The user to timeout', type: 6, required: true },
        { name: 'duration', description: 'Duration of the timeout (e.g. 10m, 1h, 1d)', type: 3, required: true },
        { name: 'reason', description: 'Reason for the timeout', type: 3, required: false }
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
            return KyraUI.sendUsage({ client, message, interaction }, isSlash ? '/timeout user: <user> duration: <duration> [reason: reason]' : `${client.prefix}timeout <@user> <duration> [reason]`);
        }

        // 2. Resolve Duration and Reason
        const durationStr = isSlash ? interaction.options.getString('duration') : args[1];
        const reason = isSlash ? interaction.options.getString('reason') : args.slice(2).join(' ');
        const finalReason = reason || 'No reason provided';

        if (!durationStr) {
            return KyraUI.sendUsage({ client, message, interaction }, isSlash ? '/timeout user: <user> duration: <duration> [reason: reason]' : `${client.prefix}timeout <@user> <duration> [reason]`);
        }

        const durationMs = ms(durationStr);
        if (!durationMs || durationMs < 10000 || durationMs > 2419200000) { // Discord max 28 days
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Invalid duration. Must be between 10 seconds and 28 days.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        // 3. Permission Checks (Executor)
        if (!executor.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You need **Moderate Members** permissions.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        // 4. Permission Checks (Bot)
        if (!guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} I need **Moderate Members** permissions.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        // 5. Hierarchy/State Checks
        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} That user is not in this server.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        if (targetMember.id === executor.id) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You cannot timeout yourself.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        if (targetMember.id === guild.ownerId) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You cannot timeout the server owner.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        if (targetMember.roles.highest.position >= executor.roles.highest.position && executor.id !== guild.ownerId) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You cannot timeout this user due to role hierarchy.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        if (!targetMember.moderatable) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} I cannot timeout this user. They might have a higher role than me.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
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
                    type: 'timeout',
                    reason: `[${durationStr}] ${finalReason}`,
                    duration: durationStr
                }).catch(() => { });

                // Register Timeout Expiration Timer
                try {
                    const { Timer } = await import('#src/database/index.js');
                    const endTime = Date.now() + durationMs;
                    const timerDoc = await Timer.create({
                        userId: targetUser.id,
                        guildId: guild.id,
                        channelId: isSlash ? interaction.channelId : message.channel.id,
                        type: 'TIMEOUT',
                        message: 'Timeout Expiration',
                        duration: durationMs,
                        expiresAt: new Date(endTime),
                        completed: false
                    });

                    // Schedule immediate notification
                    setTimeout(async () => {
                        const refreshedTimer = await Timer.findOne({ _id: timerDoc._id, completed: false });
                        if (refreshedTimer) {
                            await Timer.updateOne({ _id: timerDoc._id }, { completed: true });
                            const channel = isSlash ? interaction.channel : message.channel;
                            const expireMsg = `${client.config.emojis.success} **Timeout Expired:** <@${targetUser.id}> is no longer timed out.`;
                            await channel.send({ content: expireMsg }).catch(() => { });

                            const dmContainer = KyraUI.buildDashboard(
                                `### 🛡️ **Timeout Expired**`,
                                `Your timeout in **${guild.name}** has expired.\n\n` +
                                `${client.config.emojis.dot} You can now send messages and participate again.`
                            );
                            await targetUser.send({ components: dmContainer }).catch(() => { });
                        }
                    }, durationMs);
                } catch (e) { }
            })();

            // Perform core action immediately
            await targetMember.timeout(durationMs, `${executor.user.tag}: ${finalReason}`);

            // Reply instantly
            const successContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.success} **${targetUser.tag}** has been timed out for **${durationStr}**.\n${client.config.emojis.dot} **Reason:** ${finalReason}`);
            return isSlash ? interaction.editReply({ components: successContainer, flags: KyraUI.getFlags() }) : message.reply({ components: successContainer, flags: KyraUI.getFlags() });
        } catch (error) {
            client.logger.error('Timeout', 'Failed to timeout user', error);
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} An error occurred while trying to timeout this user.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }
    }
};

