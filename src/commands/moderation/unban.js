import { KyraUI } from '#classes/KyraUI';
import { PermissionFlagsBits } from 'discord.js';
import { modLogger } from '#utils/modLogger';

export default {
    name: 'unban',
    description: 'Unbans a user from the server',
    slash: true,
    options: [
        { name: 'user_id', description: 'The ID of the user to unban', type: 3, required: true },
        { name: 'reason', description: 'Reason for the unban', type: 3, required: false }
    ],
    async execute({ client, message, interaction, args }) {
        const isSlash = !!interaction;
        if (isSlash) await interaction.deferReply({ flags: KyraUI.getFlags() });

        const executor = isSlash ? interaction.member : message.member;
        const guild = isSlash ? interaction.guild : message.guild;

        // 1. Resolve Target
        const targetId = isSlash ? interaction.options.getString('user_id') : args[0];

        if (!targetId || isNaN(targetId)) {
            return KyraUI.sendUsage({ client, message, interaction }, isSlash ? '/unban user_id: <id> [reason: reason]' : `${client.prefix}unban <user_id> [reason]`);
        }

        // 2. Resolve Arguments
        const reason = isSlash ? interaction.options.getString('reason') : args.slice(1).join(' ');
        const finalReason = reason || 'No reason provided';

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

        // 5. Action
        try {
            const targetUser = await client.users.fetch(targetId).catch(() => null);

            await guild.members.unban(targetId, `${executor.user.tag}: ${finalReason}`);

            // Clear pending Tempban Timers
            const { Timer } = await import('#src/database/index.js');
            await Timer.updateMany(
                { userId: targetId, guildId: guild.id, type: 'TEMPBAN', completed: false },
                { completed: true }
            );

            if (targetUser) {
                // Background Logging
                modLogger.log(client, {
                    guild,
                    user: targetUser,
                    moderator: executor.user,
                    type: 'unban',
                    reason: finalReason
                }).catch(() => { });
            }

            const successContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.success} User **${targetUser?.tag || targetId}** has been unbanned.\n${client.config.emojis.dot} **Reason:** ${finalReason}`);
            return isSlash ? interaction.editReply({ components: successContainer }) : message.reply({ components: successContainer, flags: KyraUI.getFlags() });
        } catch (error) {
            if (error.code === 10026) { // Unknown Ban
                const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} This user is not banned from this server.`);
                return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
            }
            client.logger.error('Unban', 'Failed to unban user', error);
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} An error occurred while trying to unban this user.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }
    }
};

