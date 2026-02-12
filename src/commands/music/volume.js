import { KyraUI } from '#classes/KyraUI';

export default {
    name: 'volume',
    description: 'Set the music volume (1-100)',
    aliases: ['vol', 'v'],
    slash: true,
    options: [
        { name: 'amount', description: 'Volume level (1-100)', type: 4, required: true }
    ],
    async execute({ client, message, interaction, args }) {
        const guildId = interaction ? interaction.guildId : message.guildId;
        const player = client.lavalink.kazagumo.players.get(guildId);

        if (!player) {
            const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} There is no music playing right now.`);
            return interaction ? interaction.reply({ components: msg, flags: KyraUI.getFlags() }) : message.reply({ components: msg, flags: KyraUI.getFlags() });
        }

        let volume = interaction ? interaction.options.getInteger('amount') : parseInt(args[0]);

        if (isNaN(volume) || volume < 0 || volume > 100) {
            const errorMsg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Please provide a valid volume between 0 and 100.`);
            return interaction ? interaction.reply({ components: errorMsg, flags: KyraUI.getFlags() }) : message.reply({ components: errorMsg, flags: KyraUI.getFlags() });
        }

        // Apply volume immediately
        player.setVolume(volume);

        const successMsg = KyraUI.buildSimpleMessage(`${client.config.emojis.success} **Volume set to ${volume}%**`);

        // Use followUp/reply without unnecessary await if possible for speed
        if (interaction) return interaction.reply({ components: successMsg, flags: KyraUI.getFlags() });
        return message.reply({ components: successMsg, flags: KyraUI.getFlags() });
    }
};
