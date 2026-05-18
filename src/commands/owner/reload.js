import { KyraUI } from '#classes/KyraUI';

export default {
    name: 'reload',
    description: 'Reloads all commands and events',
    aliases: ['rel', 'refresh'],
    ownerOnly: true,
    async execute({ client, message, interaction }) {
        // Owner Check
        const user = interaction ? interaction.user : message.author;
        if (!client.config.ownerId.includes(user.id)) {
            const error = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You are not authorized to use this command.`);
            if (interaction) return interaction.reply({ components: error, flags: KyraUI.getFlags(true) });
            return message.reply({ components: error, flags: KyraUI.getFlags() });
        }

        const loadingEmbed = KyraUI.buildSimpleMessage(`${client.config.emojis.loading} Reloading system components...`);
        let response;
        if (interaction) {
            response = await interaction.reply({ components: loadingEmbed, fetchReply: true, flags: KyraUI.getFlags(true) });
        } else {
            response = await message.reply({ components: loadingEmbed, flags: KyraUI.getFlags() });
        }

        try {
            const startTime = Date.now();

            // Reload Commands
            await client.commandHandler.reloadCommands();

            // Reload Events
            await client.eventHandler.reloadEvents();

            // Reload Music Events
            await client.lavalink.reloadMusicEvents();

            const duration = Date.now() - startTime;
            const successEmbed = KyraUI.buildSimpleMessage(
                `${client.config.emojis.success} **System Reload Complete**\n` +
                `${client.config.emojis.dot} Commands, Events & Music refreshed in \`${duration}ms\``
            );

            if (interaction) await interaction.editReply({ components: successEmbed });
            else await response.edit({ components: successEmbed });

        } catch (error) {
            client.logger.error('RELOAD', 'Failed to reload system components:', error);
            const errorEmbed = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Critical failure during system reload.`);

            if (interaction) await interaction.editReply({ components: errorEmbed });
            else await response.edit({ components: errorEmbed });
        }
    }
};
