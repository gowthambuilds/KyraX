import { glob } from 'glob';
import { logger } from '#utils/logger';

export class CommandHandler {
    constructor(client) {
        this.client = client;
    }

    async loadCommands() {
        const commandFiles = await glob('commands/**/*.js', { absolute: true });

        for (const file of commandFiles) {
            try {
                const command = (await import(`file://${file}`)).default;
                if (!command.name || !command.execute) {
                    logger.warn('Commands', `Command at ${file} is missing name or execute function`);
                    continue;
                }

                this.client.commands.set(command.name, command);
                logger.debug('Commands', `Loaded command: ${command.name}`);
            } catch (error) {
                logger.error('Commands', `Failed to load command at ${file}`, error);
            }
        }
    }
}
