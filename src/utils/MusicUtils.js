import {
    ContainerBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    TextDisplayBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
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
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`### ${client.config.emojis.music || '🎵'} **Now Playing..**`)
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
