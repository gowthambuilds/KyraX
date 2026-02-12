export default {
    name: 'playerEnd',
    async execute(client, player) {
        // Clear progress bar update interval when track ends
        if (player.updateInterval) {
            clearInterval(player.updateInterval);
            player.updateInterval = null;
        }
    }
};
