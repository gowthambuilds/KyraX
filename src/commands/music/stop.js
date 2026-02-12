import { KyraUI } from '#classes/KyraUI';

export default {
    name: 'stop',
    description: 'Stop the music and clear the queue',
    aliases: ['leave', 'dc'],
    slash: true,
    async execute({ client, message, interaction }) {
        const guildId = interaction ? interaction.guildId : message.guildId;
        const player = client.lavalink.kazagumo.players.get(guildId);

        if (!player) {
            const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} There is no music playing right now.`);
            return interaction ? interaction.reply({ components: msg, flags: KyraUI.getFlags() }) : message.reply({ components: msg, flags: KyraUI.getFlags() });
        }

        player.destroy();

        const successMsg = KyraUI.buildSimpleMessage(`${client.config.emojis.success} Stopped the music and cleared the queue.`);
        return interaction ? interaction.reply({ components: successMsg, flags: KyraUI.getFlags() }) : message.reply({ components: successMsg, flags: KyraUI.getFlags() });
    }
};
