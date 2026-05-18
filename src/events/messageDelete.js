import { Events } from 'discord.js';

export default {
    name: Events.MessageDelete,
    async execute(message, client) {
        if (!message.guild || message.author?.bot) return;

        client.snipes.set(message.channel.id, {
            content: message.content,
            author: message.author,
            image: message.attachments.first()?.proxyURL || null,
            timestamp: Date.now(),
            attachments: message.attachments.map(a => ({
                url: a.url,
                proxyURL: a.proxyURL,
                contentType: a.contentType,
                name: a.name
            }))
        });
    }
};
