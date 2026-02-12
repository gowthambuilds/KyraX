import { KyraUI } from '#classes/KyraUI';
import { PermissionFlagsBits } from 'discord.js';
import { modLogger } from '#utils/modLogger';

export default {
    name: 'ban',
    description: 'Bans a member from the server',
    slash: true,
    options: [
        { name: 'user', description: 'The user to ban', type: 6, required: true },
        { name: 'reason', description: 'Reason for the ban', type: 3, required: false },
        { name: 'delete_messages', description: 'Days of messages to delete', type: 10, required: false }
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
            return KyraUI.sendUsage({ client, message, interaction }, isSlash ? '/ban user: <user> [reason: reason] [delete_messages: true/false]' : `${client.prefix}ban <@user> [reason] [--delete]`);
        }

        // 2. Resolve Arguments
        const reason = isSlash ? interaction.options.getString('reason') : args.slice(1).join(' ');
        const deleteDays = isSlash ? interaction.options.getNumber('delete_messages') || 0 : 0;
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
            // Kick off logging in background
            modLogger.log(client, {
                guild,
                user: targetUser,
                moderator: executor.user,
                type: 'ban',
                reason: finalReason
            }).catch(() => { });

            // Perform core action immediately
            await guild.members.ban(targetUser.id, { reason: `${executor.user.tag}: ${finalReason}`, deleteMessageSeconds: deleteDays * 86400 });

            // Reply instantly
            const successContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.success} **${targetUser.tag}** has been banned.\n${client.config.emojis.dot} **Reason:** ${finalReason}`);
            return isSlash ? interaction.editReply({ components: successContainer }) : message.reply({ components: successContainer, flags: KyraUI.getFlags() });
        } catch (error) {
            client.logger.error('Ban', 'Failed to ban user', error);
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} An error occurred while trying to ban this user.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }
    }
};
