import { KyraUI } from '#classes/KyraUI';

export default {
    name: 'leave',
    description: 'Disconnect the bot from the voice channel',
    aliases: ['dc', 'disconnect'],
    slash: true,
    async execute({ client, message, interaction }) {
        const guildId = interaction ? interaction.guildId : message.guildId;
        const player = client.lavalink.kazagumo.players.get(guildId);

        if (!player) {
            const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} I am not connected to any voice channel.`);
            return interaction ? interaction.reply({ components: msg, flags: KyraUI.getFlags() }) : message.reply({ components: msg, flags: KyraUI.getFlags() });
        }

        player.destroy();

        const successMsg = KyraUI.buildSimpleMessage(`${client.config.emojis.success} Disconnected from the voice channel.`);
        return interaction ? interaction.reply({ components: successMsg, flags: KyraUI.getFlags() }) : message.reply({ components: successMsg, flags: KyraUI.getFlags() });
    }
};
