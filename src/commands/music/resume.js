import { KyraUI } from '#classes/KyraUI';

export default {
    name: 'resume',
    description: 'Resume the paused song',
    aliases: ['continue'],
    slash: true,
    async execute({ client, message, interaction }) {
        const guildId = interaction ? interaction.guildId : message.guildId;
        const player = client.lavalink.kazagumo.players.get(guildId);

        if (!player) {
            const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} There is no music playing right now.`);
            return interaction ? interaction.reply({ components: msg, flags: KyraUI.getFlags() }) : message.reply({ components: msg, flags: KyraUI.getFlags() });
        }

        if (!player.paused) {
            const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} The music is not paused.`);
            return interaction ? interaction.reply({ components: msg, flags: KyraUI.getFlags() }) : message.reply({ components: msg, flags: KyraUI.getFlags() });
        }

        player.pause(false);

        const successMsg = KyraUI.buildSimpleMessage(`${client.config.emojis.success} Resumed the music.`);
        return interaction ? interaction.reply({ components: successMsg, flags: KyraUI.getFlags() }) : message.reply({ components: successMsg, flags: KyraUI.getFlags() });
    }
};
