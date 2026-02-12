import { KyraUI } from '#classes/KyraUI';
import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize } from 'discord.js';

export default {
    name: 'queue',
    description: 'View the music queue',
    aliases: ['q', 'list'],
    slash: true,
    options: [
        { name: 'mode', description: 'Action to perform (view/reset)', type: 3, required: false, choices: [{ name: 'View', value: 'view' }, { name: 'Reset', value: 'reset' }] }
    ],
    async execute({ client, message, interaction, args }) {
        const guildId = interaction ? interaction.guildId : message.guildId;
        const player = client.lavalink.kazagumo.players.get(guildId);

        const mode = interaction ? interaction.options.getString('mode') : (args[0] === 'reset' ? 'reset' : 'view');

        if (!player || (!player.queue.size && !player.queue.current)) {
            const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} There is no music playing right now.`);
            return interaction ? interaction.reply({ components: msg, flags: KyraUI.getFlags() }) : message.reply({ components: msg, flags: KyraUI.getFlags() });
        }

        if (mode === 'reset') {
            player.queue.clear();
            const successMsg = KyraUI.buildSimpleMessage(`${client.config.emojis.success} Cleared the queue.`);
            return interaction ? interaction.reply({ components: successMsg, flags: KyraUI.getFlags() }) : message.reply({ components: successMsg, flags: KyraUI.getFlags() });
        }

        const currentTrack = player.queue.current;
        const tracks = player.queue; // Kazagumo queue is iterable
        const nextTracks = tracks.map((track, i) => `\`${i + 1}.\` **${track.title}** (${track.isStream ? 'LIVE' : new Date(track.length).toISOString().substr(11, 8).replace(/^00:/, '')})`).slice(0, 10).join('\n');

        const container = new ContainerBuilder();

        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `### 🎵 **Music Queue**\n` +
            `**Now Playing:**\n` +
            `${client.config.emojis.dot} [**${currentTrack.title}**](${currentTrack.uri}) - ${currentTrack.author}\n\n` +
            `**Next Up:**\n` +
            `${nextTracks || '*No more tracks in queue.*'}`
        ));

        if (tracks.size > 10) {
            container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`*And ${tracks.size - 10} more...*`));
        }

        const response = { components: [container], flags: KyraUI.getFlags() };
        return interaction ? interaction.reply(response) : message.reply(response);
    }
};
