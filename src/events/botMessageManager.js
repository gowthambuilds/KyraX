import { Events } from 'discord.js';

export default {
    name: Events.MessageCreate,
    async execute(message, client) {
        // Only monitor messages sent by the bot itself
        if (message.author.id !== client.user.id) return;

        // Skip log channels and DMs
        if (!message.guild || Object.values(client.config.bot.logs).includes(message.channel.id)) return;

        const errorEmoji = client.config.emojis.error;
        const successEmoji = client.config.emojis.success;

        // Check content, embeds, and components for error or success emojis that should be temporary
        const isTemporary = (content) => {
            if (!content) return false;
            const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
            return contentStr.includes(errorEmoji) || (contentStr.includes(successEmoji) && contentStr.includes('Started'));
        };

        const shouldDelete = isTemporary(message.content) ||
            message.embeds.some(e => isTemporary(e.title) || isTemporary(e.description)) ||
            message.components.some(c => JSON.stringify(c).includes(errorEmoji));

        if (shouldDelete) {
            // Auto-delete after 5 seconds
            setTimeout(() => {
                message.delete().catch(() => { });
            }, 5000);
        }
    }
};
