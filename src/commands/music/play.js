import { KyraUI } from '#classes/KyraUI';
import { ContainerBuilder, SectionBuilder, ThumbnailBuilder, TextDisplayBuilder } from 'discord.js';

const formatTime = (ms) => {
    if (isNaN(ms) || ms < 0) return '00:00';
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor(ms / (1000 * 60 * 60));
    return (hours > 0 ? `${hours}:` : '') +
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export default {
    name: 'play',
    description: 'Play a song or playlist from various sources',
    aliases: ['p', 'music', 'pl'],
    slash: true,
    options: [
        { name: 'query', description: 'The song name or URL to play', type: 3, required: true }
    ],
    async execute({ client, message, interaction, args }) {
        const member = interaction ? interaction.member : message.member;
        const channel = interaction ? interaction.channel : message.channel;
        const query = interaction ? interaction.options.getString('query') : args.join(' ');

        if (!member.voice.channel) {
            const errorEmbed = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You need to be in a voice channel to play music.`, client);
            return interaction ? interaction.reply({ components: errorEmbed, flags: KyraUI.getFlags() }) : message.reply({ components: errorEmbed, flags: KyraUI.getFlags() });
        }

        if (!query) {
            const errorEmbed = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Please provide a song name or link.`, client);
            return interaction ? interaction.reply({ components: errorEmbed, flags: KyraUI.getFlags() }) : message.reply({ components: errorEmbed, flags: KyraUI.getFlags() });
        }

        // Detect if query is a URL
        const isUrl = /^https?:\/\//.test(query);

        // Send loading message
        const loadingMsg = KyraUI.buildSimpleMessage(`${client.config.emojis.loading} ${isUrl ? 'Processing link...' : `Searching for **${query}**...`}`);
        let responseMsg;

        if (interaction) {
            await interaction.deferReply();
        } else {
            responseMsg = await message.reply({ components: loadingMsg, flags: KyraUI.getFlags() });
        }

        try {
            // Optimize VC Bitrate for Quality
            if (member.voice.channel.viewable && member.voice.channel.manageable) {
                const maxBitrate = member.guild.maximumBitrate;
                if (member.voice.channel.bitrate < maxBitrate) {
                    await member.voice.channel.setBitrate(maxBitrate).catch(() => { });
                }
            }

            // Get Kazagumo player
            const player = await client.lavalink.kazagumo.createPlayer({
                guildId: member.guild.id,
                textId: channel.id,
                voiceId: member.voice.channel.id,
                volume: 100,
                deaf: true
            });

            let result = await client.lavalink.kazagumo.search(query, { requester: member.user });

            // Fallback Search Logic
            if (!result.tracks.length) {
                result = await client.lavalink.kazagumo.search(query, { requester: member.user, engine: 'soundcloud' });
                if (!result.tracks.length) {
                    result = await client.lavalink.kazagumo.search(`ytsearch:${query}`, { requester: member.user });
                }
            }

            if (!result.tracks.length) {
                const errorEmbed = KyraUI.buildSimpleMessage(`${client.config.emojis.error} No results found for **${query}**.`);
                if (interaction) return interaction.editReply({ components: errorEmbed, flags: KyraUI.getFlags() });
                if (responseMsg) return responseMsg.edit({ components: errorEmbed, flags: KyraUI.getFlags() });
                return message.reply({ components: errorEmbed, flags: KyraUI.getFlags() });
            }

            if (result.type === 'PLAYLIST') {
                for (const track of result.tracks) {
                    player.queue.add(track);
                }
            } else {
                player.queue.add(result.tracks[0]);
            }

            if (!player.playing && !player.paused) player.play();

            const track = result.tracks[0];
            const isPlaylist = result.type === 'PLAYLIST';
            const count = isPlaylist ? result.tracks.length : 1;

            const container = new ContainerBuilder();
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 📥 **Added to Queue**`));

            const section = new SectionBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `**${isPlaylist ? result.playlistName : track.title}**\n` +
                    `${isPlaylist ? `${client.config.emojis.dot} **Tracks:** \`${count}\`\n` : ''}` +
                    `${client.config.emojis.dot} **Author:** ${track.author}\n` +
                    `${client.config.emojis.dot} **Duration:** ${track.isStream ? 'LIVE' : formatTime(track.length)}\n` +
                    `${client.config.emojis.dot} **Requested by:** ${member.user.username}`
                ))
                .setThumbnailAccessory(new ThumbnailBuilder().setURL(track.thumbnail || client.user.displayAvatarURL()));

            container.addSectionComponents(section);

            const response = { components: [container], flags: KyraUI.getFlags() };

            if (interaction) await interaction.editReply(response);
            else if (responseMsg) await responseMsg.edit(response);
            else await message.reply(response);

        } catch (error) {
            client.logger.error('Music', `Failed to play track: ${query}`, error);
            const errorEmbed = KyraUI.buildSimpleMessage(`${client.config.emojis.error} An error occurred while trying to play the track.`);

            if (interaction && !interaction.replied) await interaction.editReply({ components: errorEmbed, flags: KyraUI.getFlags() });
            else if (responseMsg) await responseMsg.edit({ components: errorEmbed, flags: KyraUI.getFlags() });
        }
    }
};
