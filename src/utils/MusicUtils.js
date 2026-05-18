import {
    ContainerBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    TextDisplayBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} from 'discord.js';
import { KyraUI } from '#classes/KyraUI';

const formatTime = (ms) => {
    if (isNaN(ms) || ms < 0) return '00:00';
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor(ms / (1000 * 60 * 60));
    return (hours > 0 ? `${hours}:` : '') +
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export class MusicUtils {
    static getPlayerPanel(client, player, track) {
        if (!track) return { content: 'No track currently playing.' };

        const container = new ContainerBuilder();

        // Header
        const isSpotify = track.uri?.includes('spotify.com');
        const isYouTube = track.uri?.includes('youtube.com') || track.uri?.includes('youtu.be');
        const sourceEmoji = isSpotify ? (client.config.emojis.spotify || '🎵') : (isYouTube ? (client.config.emojis.youtube || '🎵') : (client.config.emojis.music || '🎵'));

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`### ${sourceEmoji} **Now Playing..**`)
        );

        // Main Info Section with Side Thumbnail
        const section = new SectionBuilder();

        section.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `[**${track.title || 'Unknown Track'}**](${track.uri || '#'}) - *${track.author || 'Unknown Artist'}*\n` +
                `Duration: \`${track.isStream ? 'LIVE' : formatTime(track.length)}\``
            )
        );

        if (track.thumbnail) {
            section.setThumbnailAccessory(
                new ThumbnailBuilder().setURL(track.thumbnail)
            );
        }

        container.addSectionComponents(section);

        // Queue & Requester Info
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `Queue: ${player.queue.length} • Requested by ${track.requester?.username || track.requester || 'User'}`
            )
        );

        // Filter Dropdown
        const filterMenu = new StringSelectMenuBuilder()
            .setCustomId('player_filter')
            .setPlaceholder('✨ Apply Audio Filters & Effects')
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel('Reset Filters')
                    .setDescription('Clear all active audio effects.')
                    .setValue('filter_reset')
                    .setEmoji('🔄'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Bass Boost')
                    .setDescription('Punchy lows for extra impact.')
                    .setValue('filter_bassboost')
                    .setEmoji('🔊'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Nightcore')
                    .setDescription('Speed & pitch bump for energy (Timescale).')
                    .setValue('filter_nightcore')
                    .setEmoji('⚡'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Vaporwave')
                    .setDescription('Slowed & pitched down for a dreamy vibe (Timescale).')
                    .setValue('filter_vaporwave')
                    .setEmoji('🌊'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('3D / Rotation')
                    .setDescription('Surrounding 3D stereo audio effect.')
                    .setValue('filter_3d')
                    .setEmoji('🎧'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Karaoke')
                    .setDescription('Removes or reduces vocals from the track.')
                    .setValue('filter_karaoke')
                    .setEmoji('🎤'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Tremolo')
                    .setDescription('Rapid volume oscillation for a shaking effect.')
                    .setValue('filter_tremolo')
                    .setEmoji('📳'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Vibrato')
                    .setDescription('Subtle pitch oscillation for a living sound.')
                    .setValue('filter_vibrato')
                    .setEmoji('〰️'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Distortion')
                    .setDescription('Adds a heavy distorted effect to the audio.')
                    .setValue('filter_distortion')
                    .setEmoji('🔥'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Low Pass Filter')
                    .setDescription('Softens highs for a muffled/lo-fi sound.')
                    .setValue('filter_lowpass')
                    .setEmoji('☕'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Channel Mix')
                    .setDescription('Mix left/right audio channels creatively.')
                    .setValue('filter_channelmix')
                    .setEmoji('🎚️')
            );

        container.addActionRowComponents(new ActionRowBuilder().addComponents(filterMenu));

        // Playback Controls (Buttons)
        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('player_previous').setEmoji('⏮️').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('player_pause').setEmoji(player.paused ? '▶️' : '⏸️').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('player_skip').setEmoji('⏭️').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('player_stop').setEmoji('⏹️').setStyle(ButtonStyle.Secondary)
        );

        container.addActionRowComponents(buttons);

        return { components: [container], flags: KyraUI.getFlags() };
    }
}
