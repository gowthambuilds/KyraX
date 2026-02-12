import { KyraUI } from '#classes/KyraUI';
import { PermissionFlagsBits } from 'discord.js';
import { Guild } from '#src/database/index.js';
import { StatManager } from '#utils/StatManager';

export default {
    name: 'serverstats',
    description: 'Setup live server statistics in the current channel',
    aliases: ['ss'],
    slash: true,
    async execute({ client, message, interaction }) {
        const isSlash = !!interaction;
        const guild = isSlash ? interaction.guild : message.guild;
        const channel = isSlash ? interaction.channel : message.channel;
        const executor = isSlash ? interaction.member : message.member;

        if (!executor.permissions.has(PermissionFlagsBits.Administrator) && !executor.permissions.has(PermissionFlagsBits.ManageChannels)) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You need **Administrator** or **Manage Channels** permissions.`);
            return isSlash ? interaction.reply({ components: errorContainer, flags: KyraUI.getFlags(true) }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        if (isSlash) await interaction.deferReply({ flags: KyraUI.getFlags() });

        try {
            // Check for existing setup
            const guildSettings = await Guild.findById(guild.id);
            if (guildSettings?.serverStats?.enabled && guildSettings.serverStats.messageId) {
                // Delete old message if it exists
                const oldChannel = await guild.channels.fetch(guildSettings.serverStats.channelId).catch(() => null);
                if (oldChannel) {
                    const oldMsg = await oldChannel.messages.fetch(guildSettings.serverStats.messageId).catch(() => null);
                    if (oldMsg) await oldMsg.delete().catch(() => { });
                }
            }

            // Create initial placeholder/initial container
            const initialContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.loading} Initializing server statistics...`);

            const statsMsg = isSlash
                ? await interaction.editReply({ components: initialContainer })
                : await message.reply({ components: initialContainer, flags: KyraUI.getFlags() });

            // Update Database
            await Guild.findOneAndUpdate(
                { _id: guild.id },
                {
                    'serverStats.enabled': true,
                    'serverStats.channelId': channel.id,
                    'serverStats.messageId': statsMsg.id,
                },
                { upsert: true }
            );

            // Fetch updated guild settings to include in StatManager call
            const updatedSettings = await Guild.findById(guild.id);

            // Initial Update
            await StatManager.updateGuild(client, guild, updatedSettings);

            if (!isSlash) {
                // Confirm setup (since we used message.reply, the statsMsg IS the confirmation/dashboard)
            } else {
                // For slash, the statsMsg is the response.
            }

        } catch (error) {
            client.logger.error('ServerStats', 'Failed to setup stats', error);
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Failed to setup statistics. Ensure I have the necessary permissions.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }
    }
};
