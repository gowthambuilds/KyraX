import { MusicUtils } from '#utils/MusicUtils';

export default {
    name: 'playerStart',
    async execute(client, player, track) {
        // Update Session & Persistent Stats
        client.musicStats.songsPlayed++;
        client.musicStats.totalSongsPlayed++;

        try {
            const { BotStats } = await import('#src/database/index.js');
            await BotStats.updateOne({ _id: 'global' }, { $inc: { totalSongsPlayed: 1 } });
        } catch (e) {
            client.logger.error('DATABASE', 'Failed to update global music stats', e);
        }

        // Apply High-Fidelity Equalizer for improved quality
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

        const buildEmbed = () => MusicUtils.getPlayerPanel(client, player, track);

        try {
            const response = buildEmbed();
            const message = await channel.send(response);
            player.nowPlayingMessageId = message.id;

            // Update Voice Channel Status
            if (player.voiceId) {
                try {
                    // Correct REST path for voice status in D.JS v14.25 (API v10)
                    // Path: /channels/{channel.id}/voice-status
                    const status = `Playing ${track.title}`.substring(0, 500);
                    await client.rest.put(`/channels/${player.voiceId}/voice-status`, {
                        body: { status }
                    });
                } catch (e) {
                    client.logger.error('Music', `Failed to set VC Status for channel ${player.voiceId}`, e);
                }
            }
        } catch (error) {
            client.logger.error('Music', 'Failed to handle Now Playing logic', error);
        }
    }
};
