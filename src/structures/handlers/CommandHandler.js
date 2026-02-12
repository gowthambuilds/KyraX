import { glob } from 'glob';
import path from 'path';

export class CommandHandler {
    constructor(client) {
        this.client = client;
    }

    async loadCommands() {
        const commandFiles = await glob('src/commands/**/*.js');
        let successCount = 0;
        let failCount = 0;

        for (const file of commandFiles) {
            const filePath = path.resolve(file);
            try {
                const { default: command } = await import(`file://${filePath}`);

                if (command?.name) {
                    this.client.commands.set(command.name, command);
                    this.client.logger.info('COMMAND', `Index entry initialized: ${command.name}`);
                    successCount++;
                } else {
                    throw new Error('Command file missing export name.');
                }
            } catch (error) {
                this.client.logger.error('COMMAND', `Failed to load ${file}`, error);
                failCount++;
            }
        }

        if (failCount > 0) {
            this.client.logger.warn('CommandHandler', `Indexing complete: ${successCount} success, ${failCount} failure(s).`);
        } else {
            this.client.logger.success('CommandHandler', `Successfully indexed all ${successCount} application commands.`);
        }
    }
}
