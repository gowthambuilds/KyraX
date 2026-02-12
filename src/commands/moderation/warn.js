import { KyraUI } from '#classes/KyraUI';
import { PermissionFlagsBits } from 'discord.js';
import { modLogger } from '#utils/modLogger';

export default {
    name: 'warn',
    description: 'Warns a member in the server',
    slash: true,
    options: [
        { name: 'user', description: 'The user to warn', type: 6, required: true },
        { name: 'reason', description: 'Reason for the warning', type: 3, required: false }
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
            return KyraUI.sendUsage({ client, message, interaction }, isSlash ? '/warn user: <user> [reason: reason]' : `${client.prefix}warn <@user> [reason]`);
        }

        // 2. Resolve Reason
        const reason = isSlash ? interaction.options.getString('reason') : args.slice(1).join(' ');
        const finalReason = reason || 'No reason provided';

        // 3. Permission Checks (Executor)
        if (!executor.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You need **Moderate Members** permissions.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        // 4. Hierarchy/State Checks
        if (targetUser.id === executor.id) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You cannot warn yourself.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        if (targetUser.bot) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You cannot warn bots.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
        if (targetMember) {
            if (targetMember.roles.highest.position >= executor.roles.highest.position && executor.id !== guild.ownerId) {
                const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You cannot warn this user due to role hierarchy.`);
                return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
            }
        }

        // 5. Action (Ultrafast Execution)
        try {
            // Kick off logging in background (completely non-blocking)
            modLogger.log(client, {
                guild,
                user: targetUser,
                moderator: executor.user,
                type: 'warn',
                reason: finalReason
            }).catch(() => { });

            const successContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.success} **${targetUser.tag}** has been warned.\n${client.config.emojis.dot} **Reason:** ${finalReason}`);
            return isSlash ? interaction.editReply({ components: successContainer }) : message.reply({ components: successContainer, flags: KyraUI.getFlags() });
        } catch (error) {
            client.logger.error('Warn', 'Failed to warn user', error);
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} An error occurred while trying to warn this user.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }
    }
};
