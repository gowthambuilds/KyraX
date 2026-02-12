export default {
    name: 'clientReady',
    once: true,
    async execute(client) {
        client.logger.success('Client', `${client.user.tag} is ready!`);
        client.logger.info('Client', `Serving ${client.guilds.cache.size} guilds.`);

        // Register Slash Commands
        try {
            const slashData = client.commands
                .filter(cmd => cmd.name !== 'ping') // ping isn't fully hybrid yet in my code, but help/panel/prefixset are
                .map(cmd => ({
                    name: cmd.name,
                    description: cmd.description,
                    options: cmd.options || []
                }));

            // Adding ping to slash data manually if needed or update ping.js
            slashData.push({ name: 'ping', description: 'Check bot latency' });

            await client.application.commands.set(slashData);
            client.logger.success('Client', 'Slash commands registered successfully.');
        } catch (error) {
            client.logger.error('Client', 'Failed to register slash commands', error);
        }
    }
};

