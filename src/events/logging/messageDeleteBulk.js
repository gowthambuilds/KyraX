import { Events, AuditLogEvent } from 'discord.js';
import { EventLogger } from '#utils/eventLogger';

export default {
    name: Events.MessageBulkDelete,
    async execute(messages, channel, client) {
        const { guild } = channel;
        if (!guild) return;

        const executor = await EventLogger.getExecutor(guild, AuditLogEvent.MessageBulkDelete);

        const title = `📦 Bulk Messages Deleted`;
        const description = `**${messages.size}** messages were bulk deleted in <#${channel.id}>.`;

        const fields = [
            { name: 'Channel', value: `<#${channel.id}> (\`${channel.id}\`)`, inline: true },
            { name: 'Executor', value: executor ? `<@${executor.id}> (\`${executor.tag}\`)` : 'Unknown', inline: true }
        ];

        await EventLogger.log(client, guild, 'message', {
            title,
            description,
            color: '#F04747',
            fields
        });
    }
};
