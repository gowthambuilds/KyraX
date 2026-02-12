import { KyraUI } from '#classes/KyraUI';
import { PermissionFlagsBits } from 'discord.js';
import { modLogger } from '#utils/modLogger';

export default {
    name: 'kick',
    description: 'Kicks a member from the server',
    slash: true,
    options: [
        { name: 'user', description: 'The user to kick', type: 6, required: true },
        { name: 'reason', description: 'Reason for the kick', type: 3, required: false }
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
            return KyraUI.sendUsage({ client, message, interaction }, isSlash ? '/kick user: <user> [reason: reason]' : `${client.prefix}kick <@user> [reason]`);
        }

        // 2. Resolve Arguments
        const reason = isSlash ? interaction.options.getString('reason') : args.slice(1).join(' ');
        const finalReason = reason || 'No reason provided';

        // 3. Permission Checks (Executor)
        if (!executor.permissions.has(PermissionFlagsBits.KickMembers)) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You need **Kick Members** permissions.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        // 4. Permission Checks (Bot)
        if (!guild.members.me.permissions.has(PermissionFlagsBits.KickMembers)) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} I need **Kick Members** permissions.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        // 5. Hierarchy Checks
        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} That user is not in this server.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        if (targetMember.id === executor.id) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You cannot kick yourself.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        if (targetMember.id === guild.ownerId) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You cannot kick the server owner.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        if (targetMember.roles.highest.position >= executor.roles.highest.position && executor.id !== guild.ownerId) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You cannot kick this user due to role hierarchy.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        if (!targetMember.kickable) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} I cannot kick this user. They might have a higher role than me.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        // 6. Action (Ultrafast Execution)
        try {
            // Kick off logging in background
            modLogger.log(client, {
                guild,
                user: targetUser,
                moderator: executor.user,
                type: 'kick',
                reason: finalReason
            }).catch(() => { });

            // Perform core action immediately
            await targetMember.kick(`${executor.user.tag}: ${finalReason}`);

            // Reply instantly
            const successContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.success} **${targetUser.tag}** has been kicked.\n${client.config.emojis.dot} **Reason:** ${finalReason}`);
            return isSlash ? interaction.editReply({ components: successContainer }) : message.reply({ components: successContainer, flags: KyraUI.getFlags() });
        } catch (error) {
            client.logger.error('Kick', 'Failed to kick user', error);
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} An error occurred while trying to kick this user.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }
    }
};

