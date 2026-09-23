import { glob } from 'glob';
import path from 'path';

export class EventHandler {
    constructor(client) {
        this.client = client;
        this.activeListeners = new Map(); // EventName -> Array of listener wrapper functions
    }

    async loadEvents() {
        const eventFiles = await glob('src/events/**/*.js');
        let successCount = 0;
        let failCount = 0;

        const loadPromises = eventFiles.map(async (file) => {
            const filePath = path.resolve(file);
            try {
                const { default: event } = await import(`file://${filePath}?update=${Date.now()}`);

                if (event?.name) {
                    const listener = (...args) => event.execute(...args, this.client);

                    if (event.once) {
                        this.client.once(event.name, listener);
                    } else {
                        this.client.on(event.name, listener);
                    }

                    // Store for removal
                    if (!this.activeListeners.has(event.name)) {
                        this.activeListeners.set(event.name, []);
                    }
                    this.activeListeners.get(event.name).push({
                        fn: listener,
                        once: event.once
                    });

                    this.client.logger.info('EVENT', `Kernel hook connected: ${event.name}`);
                    successCount++;
                } else {
                    throw new Error('Event file missing export name.');
                }
            } catch (error) {
                this.client.logger.error('EVENT', `Failed to integrate ${file}`, error);
                failCount++;
            }
        });

        await Promise.all(loadPromises);

        if (failCount > 0) {
            this.client.logger.warn('EventHandler', `Kernel integration complete: ${successCount} active, ${failCount} failed.`);
        } else {
            this.client.logger.success('EventHandler', `Integrated all ${successCount} event listeners into the kernel.`);
        }
    }

    async reloadEvents() {
        // Remove all active listeners added by this handler
        for (const [eventName, listeners] of this.activeListeners.entries()) {
            for (const listener of listeners) {
                this.client.removeListener(eventName, listener.fn);
            }
        }
        this.activeListeners.clear();
        await this.loadEvents();
    }
}
