import { MusicUtils } from '#utils/MusicUtils';

export default {
    name: 'playerStart',
    async execute(client, player, track) {
        // Update Session & Persistent Stats (synchronous - fast)
        client.musicStats.songsPlayed++;
        client.musicStats.totalSongsPlayed++;

        // Update database stats (fire-and-forget)
        import('#src/database/index.js').then(({ BotStats }) => {
            BotStats.updateOne({ _id: 'global' }, { $inc: { totalSongsPlayed: 1 } }).catch(() => { });
        }).catch(() => { });

        // 🚀 CRITICAL FIX: Run all heavy operations asynchronously (non-blocking)
        setImmediate(async () => {
            try {
                // Apply High-Fidelity Equalizer
                player.shoukaku.setFilters({
                    equalizer: [
                        { band: 0, gain: 0.10 },
                        { band: 1, gain: 0.10 },
                        { band: 2, gain: 0.05 },
                        { band: 12, gain: 0.10 },
                        { band: 13, gain: 0.15 }
                    ]
                }).catch(() => { });

                // Get the channel to send the message to
                const channelId = player.textId;
                if (!channelId) return;

                const channel = client.channels.cache.get(channelId);
                if (!channel) return;

                // Clear existing interval if any
                if (player.updateInterval) {
                    clearInterval(player.updateInterval);
                    player.updateInterval = null;
                }

                // Build and send now playing message
                const response = MusicUtils.getPlayerPanel(client, player, track);
                const message = await channel.send(response);
                player.nowPlayingMessageId = message.id;

                // Update Voice Channel Status (fire-and-forget)
                if (player.voiceId) {
                    const status = `Playing ${track.title}`.substring(0, 500);
                    client.rest.put(`/channels/${player.voiceId}/voice-status`, {
                        body: { status }
                    }).catch(e => {
                        client.logger.error('Music', `Failed to set VC Status for channel ${player.voiceId}`, e);
                    });
                }
            } catch (error) {
                client.logger.error('Music', 'Failed to handle Now Playing logic', error);
            }
        });
    }
};