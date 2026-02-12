import { KyraUI } from '#classes/KyraUI';
import { PermissionFlagsBits } from 'discord.js';
import { modLogger } from '#utils/modLogger';

export default {
    name: 'untimeout',
    description: 'Removes a timeout from a member',
    aliases: ['unmute'],
    slash: true,
    options: [
        { name: 'user', description: 'The user to untimeout', type: 6, required: true },
        { name: 'reason', description: 'Reason for removing the timeout', type: 3, required: false }
    ],
    async execute({ client, message, interaction, args }) {
        const isSlash = !!interaction;
        if (isSlash) await interaction.deferReply({ flags: KyraUI.getFlags() });

        const executor = isSlash ? interaction.member : message.member;
        const guild = isSlash ? interaction.guild : message.guild;

        // 1. Resolve Target
        const targetUser = isSlash
            ? interaction.options.getUser('user')
            : (message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null));

        if (!targetUser) {
            return KyraUI.sendUsage({ client, message, interaction }, isSlash ? '/untimeout user: <user> [reason: reason]' : `${client.prefix}untimeout <@user> [reason]`);
        }

        // 2. Resolve Arguments
        const reason = isSlash ? interaction.options.getString('reason') : args.slice(1).join(' ');
        const finalReason = reason || 'No reason provided';

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

        if (!targetMember.communicationDisabledUntilTimestamp) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} This user is not timed out.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        // 6. Action
        try {
            // Background Logging
            modLogger.log(client, {
                guild,
                user: targetUser,
                moderator: executor.user,
                type: 'untimeout',
                reason: finalReason
            }).catch(() => { });

            await targetMember.timeout(null, `${executor.user.tag}: ${finalReason}`);

            // Clear pending Timeout Expiration Timers
            const { Timer } = await import('#src/database/index.js');
            await Timer.updateMany(
                { userId: targetUser.id, guildId: guild.id, type: 'TIMEOUT', completed: false },
                { completed: true }
            );

            const successContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.success} Timeout removed from **${targetUser.tag}**.\n${client.config.emojis.dot} **Reason:** ${finalReason}`);
            return isSlash ? interaction.editReply({ components: successContainer, flags: KyraUI.getFlags() }) : message.reply({ components: successContainer, flags: KyraUI.getFlags() });
        } catch (error) {
            client.logger.error('Untimeout', 'Failed to remove timeout', error);
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} An error occurred while trying to remove the timeout.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }
    }
};

