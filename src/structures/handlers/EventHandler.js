import { glob } from 'glob';
import path from 'path';

export class EventHandler {
    constructor(client) {
        this.client = client;
    }

    async loadEvents() {
        const eventFiles = await glob('src/events/**/*.js');
        let successCount = 0;
        let failCount = 0;

        for (const file of eventFiles) {
            const filePath = path.resolve(file);
            try {
                const { default: event } = await import(`file://${filePath}`);

                if (event?.name) {
                    if (event.once) {
                        this.client.once(event.name, (...args) => event.execute(...args, this.client));
                    } else {
                        this.client.on(event.name, (...args) => event.execute(...args, this.client));
                    }
                    this.client.logger.info('EVENT', `Kernel hook connected: ${event.name}`);
                    successCount++;
                } else {
                    throw new Error('Event file missing export name.');
                }
            } catch (error) {
                this.client.logger.error('EVENT', `Failed to integrate ${file}`, error);
                failCount++;
            }
        }

        if (failCount > 0) {
            this.client.logger.warn('EventHandler', `Kernel integration complete: ${successCount} active, ${failCount} failed.`);
        } else {
            this.client.logger.success('EventHandler', `Integrated all ${successCount} event listeners into the kernel.`);
        }
    }
}
