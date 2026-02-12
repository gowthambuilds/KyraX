import { Routes } from 'discord.js';

export default {
    name: 'playerDestroy',
    async execute(client, player) {
        // Clear status and interval
        if (player.updateInterval) {
            clearInterval(player.updateInterval);
            player.updateInterval = null;
        }

        if (player.voiceId) {
            try {
                await client.rest.put(`/channels/${player.voiceId}/voice-status`, {
                    body: { status: '' }
                });
            } catch (e) {
                client.logger.error('Music', `Failed to clear VC Status: ${e.message}`);
            }
        }
    }
};
