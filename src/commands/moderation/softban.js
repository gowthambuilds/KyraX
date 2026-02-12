import { KyraUI } from '#classes/KyraUI';
import { PermissionFlagsBits } from 'discord.js';
import { modLogger } from '#utils/modLogger';

export default {
    name: 'softban',
    description: 'Bans and immediately unbans a user to clear their messages',
    slash: true,
    options: [
        { name: 'user', description: 'The user to softban', type: 6, required: true },
        { name: 'reason', description: 'Reason for the softban', type: 3, required: false }
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
            return KyraUI.sendUsage({ client, message, interaction }, isSlash ? '/softban user: <user> [reason: reason]' : `${client.prefix}softban <@user> [reason]`);
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

        // 5. Hierarchy Checks
        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

        if (targetMember) {
            if (targetMember.id === executor.id) {
                const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You cannot softban yourself.`);
                return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
            }

            if (targetMember.id === guild.ownerId) {
                const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You cannot softban the server owner.`);
                return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
            }

            if (targetMember.roles.highest.position >= executor.roles.highest.position && executor.id !== guild.ownerId) {
                const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You cannot softban this user due to role hierarchy.`);
                return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
            }

            if (!targetMember.bannable) {
                const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} I cannot softban this user. They might have a higher role than me.`);
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
                type: 'softban',
                reason: finalReason
            }).catch(() => { });

            // Core Actions immediately (order matters: ban than unban)
            await guild.members.ban(targetUser.id, { deleteMessageSeconds: 7 * 24 * 60 * 60, reason: `${executor.user.tag} (Softban): ${finalReason}` });
            await guild.members.unban(targetUser.id, `Softban cleanup by ${executor.user.tag}`);

            // Reply instantly
            const successContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.success} **${targetUser.tag}** has been softbanned (Kicked + Messages cleared).\n${client.config.emojis.dot} **Reason:** ${finalReason}`);
            return isSlash ? interaction.editReply({ components: successContainer }) : message.reply({ components: successContainer, flags: KyraUI.getFlags() });
        } catch (error) {
            client.logger.error('Softban', 'Failed to softban user', error);
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} An error occurred while trying to softban this user.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }
    }
};

