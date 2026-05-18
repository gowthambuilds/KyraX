import { Kazagumo } from 'kazagumo';
import { Connectors } from 'shoukaku';
import Spotify from 'kazagumo-spotify';
import { logger } from '#utils/logger';

export class LavalinkManager {
    constructor(client) {
        this.client = client;
        this.musicListeners = new Map();

        this.kazagumo = new Kazagumo({
            defaultSearchEngine: 'youtube_music',

            // 🚀 PERFORMANCE OPTIMIZATIONS
            reconnectTries: 3,
            reconnectInterval: 5,
            resumeTimeout: 60,
            resumeByLibrary: true,

            // 🚀 TIMEOUT OPTIMIZATIONS - Reduce waiting time
            moveOnDisconnect: false,

            send: (guildId, payload) => {
                const guild = client.guilds.cache.get(guildId);
                if (guild) guild.shard.send(payload);
            },

            plugins: [
                new Spotify({
                    clientId: client.config.spotify.clientId,
                    clientSecret: client.config.spotify.clientSecret,
                    playlistPageLimit: 1,
                    albumPageLimit: 1,
                    searchLimit: 10,
                    searchMarket: 'IN',
                }),
            ]
        }, new Connectors.DiscordJS(client), client.config.nodes);

        // Shoukaku event handlers
        this.kazagumo.shoukaku.on('ready', (name) => {
            logger.success('Lavalink', `Node ${name} is ready.`);
        });

        this.kazagumo.shoukaku.on('error', (name, error) => {
            logger.error('Lavalink', `Node ${name} had an error:`, error);
        });

        this.kazagumo.shoukaku.on('close', (name, code, reason) => {
            logger.warn('Lavalink', `Node ${name} closed with code ${code} and reason ${reason}`);
        });

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
            try {
                const { default: event } = await import(`file://${filePath}?update=${Date.now()}`);

                if (event.name && event.execute) {
                    const listener = (...args) => event.execute(this.client, ...args);
                    this.kazagumo.on(event.name, listener);

                    if (!this.musicListeners.has(event.name)) {
                        this.musicListeners.set(event.name, []);
                    }
                    this.musicListeners.get(event.name).push(listener);

                    logger.info('Lavalink', `Loaded music event: ${event.name}`);
                }
            } catch (error) {
                logger.error('Lavalink', `Failed to load music event ${file}`, error);
            }
        }
    }

    async reloadMusicEvents() {
        for (const [eventName, listeners] of this.musicListeners.entries()) {
            for (const listener of listeners) {
                this.kazagumo.removeListener(eventName, listener);
            }
        }
        this.musicListeners.clear();
        await this.loadMusicEvents();
    }
}