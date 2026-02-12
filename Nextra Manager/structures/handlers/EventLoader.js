import { glob } from 'glob';
import path from 'path';
import { logger } from '#utils/logger';

export class EventHandler {
    constructor(client) {
        this.client = client;
    }

    async loadEvents() {
        const eventFiles = await glob('events/**/*.js', { absolute: true });

        for (const file of eventFiles) {
            try {
                const event = (await import(`file://${file}`)).default;
                if (!event.name || !event.execute) {
                    logger.warn('Events', `Event at ${file} is missing name or execute function`);
                    continue;
                }

                if (event.once) {
                    this.client.once(event.name, (...args) => event.execute(this.client, ...args));
                } else {
                    this.client.on(event.name, (...args) => event.execute(this.client, ...args));
                }
                logger.debug('Events', `Loaded event: ${event.name}`);
            } catch (error) {
                logger.error('Events', `Failed to load event at ${file}`, error);
            }
        }
    }
}
