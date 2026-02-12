import { Events, AuditLogEvent } from 'discord.js';
import { EventLogger } from '#utils/eventLogger';

export default {
    name: Events.MessageDelete,
    async execute(message, client) {
        if (message.partial) return;
        if (message.author?.bot) return;

        const { guild, channel } = message;
        if (!guild) return;

        const executor = await EventLogger.getExecutor(guild, AuditLogEvent.MessageDelete);

        client.snipes.set(channel.id, {
            content: message.content,
            author: message.author,
            timestamp: Date.now(),
            attachments: message.attachments.map(a => a.url)
        });

        const title = `🗑️ Message Deleted`;
        const description = `A message by **${message.author.tag}** was deleted in <#${channel.id}>.`;

        const fields = [
            { name: 'Author', value: `<@${message.author.id}> (\`${message.author.id}\`)`, inline: true },
            { name: 'Channel', value: `<#${channel.id}> (\`${channel.id}\`)`, inline: true },
            { name: 'Deleted By', value: executor ? `<@${executor.id}> (\`${executor.tag}\`)` : 'Self / Unknown', inline: true }
        ];

        if (message.content) {
            fields.push({ name: 'Content', value: message.content.substring(0, 1024) });
        }

        if (message.attachments.size > 0) {
            fields.push({ name: 'Attachments', value: message.attachments.map(a => `[${a.name}](${a.url})`).join(', ') });
        }

        await EventLogger.log(client, guild, 'message', {
            title,
            description,
            color: '#F04747',
            fields
        });
    }
};
