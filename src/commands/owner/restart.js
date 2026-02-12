import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { KyraUI } from '#classes/KyraUI';

export default {
    name: 'restart',
    description: 'Restarts the bot (Owner Only).',
    aliases: ['reboot'],
    ownerOnly: true,
    async execute({ client, message }) {
        if (!client.config.ownerId.includes(message.author.id)) {
            return message.channel.send({
                content: `${client.config.emojis.error} You are not authorized to use this command.`,
                flags: KyraUI.getFlags()
            });
        }

        await message.channel.send(`${client.config.emojis.success} Restarting bot... Synchronizing all systems.`);

        client.logger.warn('SYSTEM', `Restart initiated by ${message.author.tag} (${message.author.id})`);

        // Ensure graceful shutdown if possible
        client.destroy();

        // This will exit the process. PM2 or a similar manager should auto-restart it.
        process.exit(0);
    }
};
