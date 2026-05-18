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
            const errorEmbed = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You need to be in a voice channel to play music.`);
            return interaction
                ? interaction.reply({ components: errorEmbed, flags: KyraUI.getFlags() })
                : message.reply({ components: errorEmbed, flags: KyraUI.getFlags() });
        }

        if (!query) {
            const errorEmbed = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Please provide a song name or link.`);
            return interaction
                ? interaction.reply({ components: errorEmbed, flags: KyraUI.getFlags() })
                : message.reply({ components: errorEmbed, flags: KyraUI.getFlags() });
        }

        const isUrl = /^https?:\/\//.test(query);

        let responseMsg;
        if (interaction) {
            await interaction.deferReply();
        } else {
            const loadingMsg = KyraUI.buildSimpleMessage(`${client.config.emojis.loading} Searching...`);
            responseMsg = await message.reply({ components: loadingMsg, flags: KyraUI.getFlags() });
        }

        try {
            const queryLower = query.toLowerCase();
            const forcedYouTube = queryLower.startsWith('youtube ') || queryLower.startsWith('yt ');
            const searchTerm = forcedYouTube
                ? (queryLower.startsWith('youtube ') ? query.substring(8).trim() : query.substring(3).trim())
                : query;

            const safeSearch = async (term, engine) => {
                try {
                    const searchResult = await client.lavalink.kazagumo.search(term, {
                        requester: member.user,
                        ...(engine && { engine })
                    });
                    return (searchResult?.tracks?.length > 0) ? searchResult : null;
                } catch (e) {
                    if (e instanceof SyntaxError || e.message?.includes('JSON')) {
                        client.logger.warn('Music', `Engine '${engine || 'default'}' returned invalid JSON.`);
                    } else {
                        client.logger.error('Music', `Search error on engine '${engine || 'default'}':`, e.message);
                    }
                    return null;
                }
            };

            // Run player creation and search in parallel
            const [player, result] = await Promise.all([
                (async () => {
                    const existingPlayer = client.lavalink.kazagumo.players.get(member.guild.id);
                    if (existingPlayer) return existingPlayer;

                    return await client.lavalink.kazagumo.createPlayer({
                        guildId: member.guild.id,
                        textId: channel.id,
                        voiceId: member.voice.channel.id,
                        volume: 100,
                        deaf: true
                    });
                })(),

                isUrl ? safeSearch(query) : safeSearch(searchTerm, 'youtube_music')
            ]);

            // Non-blocking bitrate optimization
            if (member.voice.channel?.viewable && member.voice.channel?.manageable) {
                setImmediate(() => {
                    try {
                        const maxBitrate = member.guild.maximumBitrate;
                        if (member.voice.channel.bitrate < maxBitrate) {
                            member.voice.channel.setBitrate(maxBitrate).catch(() => { });
                        }
                    } catch { }
                });
            }

            if (!result || !result.tracks?.length) {
                const errorEmbed = KyraUI.buildSimpleMessage(
                    `${client.config.emojis.error} No results found for **${query}**.`
                );
                return interaction
                    ? interaction.editReply({ components: errorEmbed, flags: KyraUI.getFlags() })
                    : responseMsg.edit({ components: errorEmbed, flags: KyraUI.getFlags() });
            }

            // Add tracks to queue
            if (result.type === 'PLAYLIST') {
                player.queue.add(...result.tracks);
            } else {
                player.queue.add(result.tracks[0]);
            }

            // Start playing
            if (!player.playing && !player.paused) {
                player.play();
            }

            const track = result.tracks[0];
            const isPlaylist = result.type === 'PLAYLIST';
            const count = isPlaylist ? result.tracks.length : 1;

            const isSpotifySrc = track.uri?.includes('spotify.com');
            const isYTSrc = track.uri?.includes('youtube.com') || track.uri?.includes('youtu.be');
            const srcEmoji = isSpotifySrc
                ? (client.config.emojis.spotify || '🎵')
                : (isYTSrc ? (client.config.emojis.youtube || '🎵') : (client.config.emojis.music || '🎵'));

            const container = new ContainerBuilder();
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`### ${srcEmoji} **Added to Queue**`)
            );

            const section = new SectionBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `**[${track.title}](${track.uri})**\n` +
                    `${isPlaylist ? `${client.config.emojis.dot} **Playlist:** ${result.playlistName} (${count} tracks)\n` : ''}` +
                    `${client.config.emojis.dot} **Artist:** ${track.author}\n` +
                    `${client.config.emojis.dot} **Duration:** ${track.isStream ? 'LIVE' : formatTime(track.length)}\n` +
                    `${client.config.emojis.dot} **Requested by:** ${member.user.username}`
                ))
                .setThumbnailAccessory(
                    new ThumbnailBuilder().setURL(track.thumbnail || client.user.displayAvatarURL())
                );

            container.addSectionComponents(section);

            const response = { components: [container], flags: KyraUI.getFlags() };

            return interaction
                ? interaction.editReply(response)
                : responseMsg.edit(response);

        } catch (error) {
            client.logger.error('Music', `Failed to play track: ${query}`, error);
            const errorEmbed = KyraUI.buildSimpleMessage(
                `${client.config.emojis.error} An error occurred while trying to play the track.`
            );

            if (interaction) {
                return interaction.editReply({ components: errorEmbed, flags: KyraUI.getFlags() }).catch(() => { });
            } else if (responseMsg) {
                return responseMsg.edit({ components: errorEmbed, flags: KyraUI.getFlags() }).catch(() => { });
            }
        }
    }
};