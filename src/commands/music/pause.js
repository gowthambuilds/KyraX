import { KyraUI } from '#classes/KyraUI';

export default {
    name: 'pause',
    description: 'Pause the current song',
    aliases: ['wait'],
    slash: true,
    async execute({ client, message, interaction }) {
        const guildId = interaction ? interaction.guildId : message.guildId;
        const player = client.lavalink.kazagumo.players.get(guildId);

        if (!player || !player.playing) {
            const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} There is no music playing right now.`);
            return interaction ? interaction.reply({ components: msg, flags: KyraUI.getFlags() }) : message.reply({ components: msg, flags: KyraUI.getFlags() });
        }

        player.pause(true);

        const successMsg = KyraUI.buildSimpleMessage(`${client.config.emojis.success} Paused the current song.`);
        return interaction ? interaction.reply({ components: successMsg, flags: KyraUI.getFlags() }) : message.reply({ components: successMsg, flags: KyraUI.getFlags() });
    }
};
