import { Kazagumo } from 'kazagumo';
import { Connectors } from 'shoukaku';
// import Spotify from 'kazagumo-spotify';
import { logger } from '#utils/logger';

export class LavalinkManager {
    constructor(client) {
        this.client = client;

        this.kazagumo = new Kazagumo({
            defaultSearchEngine: 'youtube_music', // Can be 'youtube', 'soundcloud', 'youtube_music'
            send: (guildId, payload) => {
                const guild = client.guilds.cache.get(guildId);
                if (guild) guild.shard.send(payload);
            }
            // plugins: [
            //     new Spotify({
            //         clientId: client.config.spotify.clientId,
            //         clientSecret: client.config.spotify.clientSecret,
            //         playlistPageLimit: 1, // optional (default: 1)
            //         albumPageLimit: 1, // optional (default: 1)
            //         searchLimit: 10, // optional (default: 10)
            //         searchMarket: 'IN', // optional: default: US
            //     }),
            // ]
        }, new Connectors.DiscordJS(client), client.config.nodes);

        this.kazagumo.shoukaku.on('ready', (name) => logger.success('Lavalink', `Node ${name} is ready.`));
        this.kazagumo.shoukaku.on('error', (name, error) => logger.error('Lavalink', `Node ${name} had an error:`, error));
        this.kazagumo.shoukaku.on('close', (name, code, reason) => logger.warn('Lavalink', `Node ${name} closed with code ${code} and reason ${reason}`));
        this.kazagumo.shoukaku.on('disconnect', (name, players, moved) => {
            if (moved) return;
            players.map(player => player.connection.disconnect());
            logger.warn('Lavalink', `Node ${name} disconnected.`);
        });

        this.loadMusicEvents();
    }

    async loadMusicEvents() {
        const { glob } = await import('glob');
        const path = await import('path');
        const eventFiles = await glob('src/events/music/**/*.js');

        for (const file of eventFiles) {
            const filePath = path.resolve(file);
            const { default: event } = await import(`file://${filePath}`);

            if (event.name && event.execute) {
                this.kazagumo.on(event.name, (...args) => event.execute(this.client, ...args));
                logger.info('Lavalink', `Loaded music event: ${event.name}`);
            }
        }
    }
}
