import { REST, Routes } from 'discord.js';
import { logger } from '#utils/logger';

const WHITELIST = ['help', 'ping', 'stats', 'gstart', 'gresume', 'greroll', 'gpause', 'gend', 'ticket', 'autobuild'];

/**
 * Register slash commands globally or to a specific guild
 * @param {import('#classes/Kyra').Kyra} client 
 */
export async function registerSlashCommands(client) {
    const rest = new REST({ version: '10' }).setToken(client.config.token);

    // Prepare slash command data (Only those explicitly whitelisted and marked as slash: true)
    const slashCommands = client.commands
        .filter(cmd => cmd.slash === true && WHITELIST.includes(cmd.name))
        .map(cmd => ({
            name: cmd.name,
            description: cmd.description,
            options: cmd.options || []
        }));

    try {
        client.logger.info('SlashRegistration', `Refreshing ${slashCommands.length} slash commands globally...`);

        // Register GLOBAL commands for public release
        await rest.put(
            Routes.applicationCommands(client.config.clientId),
            { body: slashCommands }
        );
        client.logger.success('SlashRegistration', 'Successfully registered global slash commands.');
    } catch (error) {
        client.logger.error('SlashRegistration', 'Error registering slash commands', error);
    }
}
