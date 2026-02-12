import { KyraUI } from '#classes/KyraUI';
import { Routes } from 'discord.js';

export default {
    name: 'playerEmpty',
    async execute(client, player) {
        // playerEmpty is emitted when the queue finishes.

        const channelId = player.textId;
        if (!channelId) {
            player.destroy();
            return;
        }

        const channel = client.channels.cache.get(channelId);

        // --- Autoplay Logic ---
        const isAutoplay = player.data.get('autoplay');
        if (isAutoplay && player.queue.previous) {
            try {
                const discoveryKeywords = ['lofi', 'chill beats', 'trending hits', 'slowed and reverb', 'coding chill', 'popular pop', 'indie folk'];
                const keyword = discoveryKeywords[Math.floor(Math.random() * discoveryKeywords.length)];
                const query = keyword; // Search by keyword only for variety

                const searchResult = await client.lavalink.kazagumo.search(query, { requester: client.user });

                if (searchResult.tracks.length > 0) {
                    // Filter out the previous track to avoid loops
                    const filteredTracks = searchResult.tracks.filter(t =>
                        t.uri !== player.queue.previous.uri &&
                        t.title.toLowerCase() !== player.queue.previous.title.toLowerCase()
                    );

                    // Pick random track from top results for variety
                    const nextTrack = filteredTracks.length > 0
                        ? filteredTracks[Math.floor(Math.random() * Math.min(filteredTracks.length, 5))]
                        : searchResult.tracks[0];

                    if (nextTrack) {
                        player.play(nextTrack);
                        if (channel) {
                            const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.music || '🎵'} **Autoplay:** End of queue, reaching for **${keyword}** vibes... playing **${nextTrack.title}**`);
                            await channel.send({ components: msg, flags: KyraUI.getFlags() }).catch(() => { });
                        }
                        return;
                    }
                }
            } catch (error) {
                client.logger.error('Music', 'Autoplay discovery failed', error);
            }
        }

        if (channel) {
            const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.music || '🎵'} **Queue finished.** Leaving voice channel...`);
            await channel.send({ components: msg, flags: KyraUI.getFlags() }).catch(() => { });
        }

        // Destroy the player (disconnect)
        player.destroy();
    }
};
