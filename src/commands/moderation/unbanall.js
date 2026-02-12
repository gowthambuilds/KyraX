import { KyraUI } from '#classes/KyraUI';
import { PermissionFlagsBits } from 'discord.js';

export default {
    name: 'unbanall',
    description: 'Unbans everyone in the server (Owner only)',
    slash: true,
    async execute({ client, message, interaction }) {
        const isSlash = !!interaction;
        const guild = isSlash ? interaction.guild : message.guild;
        const executor = isSlash ? interaction.member : message.member;

        // Owner Only Check
        if (executor.id !== guild.ownerId) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Only the **Server Owner** can use this command.`);
            return isSlash ? interaction.reply({ components: errorContainer, flags: KyraUI.getFlags(true) }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        if (!guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} I need **Ban Members** permissions to unban users.`);
            return isSlash ? interaction.reply({ components: errorContainer, flags: KyraUI.getFlags(true) }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        try {
            const bans = await guild.bans.fetch();
            if (bans.size === 0) {
                const infoContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.dot} There are no banned users in this server.`);
                return isSlash ? interaction.reply({ components: infoContainer, flags: KyraUI.getFlags() }) : message.reply({ components: infoContainer, flags: KyraUI.getFlags() });
            }

            const loadingContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.loading} Unbanning **${bans.size}** users...`);
            const statusMsg = isSlash ? await interaction.reply({ components: loadingContainer, fetchReply: true, flags: KyraUI.getFlags() }) : await message.reply({ components: loadingContainer, flags: KyraUI.getFlags() });

            let count = 0;
            for (const [userId, ban] of bans) {
                await guild.members.unban(userId, `Mass unban by ${executor.user.tag}`).catch(() => { });
                count++;
            }

            // Clear all tempban timers
            const { Timer } = await import('#src/database/index.js');
            await Timer.updateMany(
                { guildId: guild.id, type: 'TEMPBAN', completed: false },
                { completed: true }
            );

            const successContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.success} Successfully unbanned **${count}** users and cleared all temporary ban timers.`);
            return isSlash ? interaction.editReply({ components: successContainer }) : statusMsg.edit({ components: successContainer });
        } catch (error) {
            client.logger.error('UnbanAll', 'Failed to unban all users', error);
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} An error occurred while trying to unban everyone.`);
            return isSlash ? interaction.reply({ components: errorContainer, flags: KyraUI.getFlags(true) }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }
    }
};
