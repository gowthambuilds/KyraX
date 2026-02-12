import { Events, AuditLogEvent } from 'discord.js';
import { EventLogger } from '#utils/eventLogger';

export default {
    name: Events.ThreadCreate,
    async execute(thread, client) {
        const { guild } = thread;
        const executor = await EventLogger.getExecutor(guild, AuditLogEvent.ThreadCreate);

        await EventLogger.log(client, guild, 'thread', {
            title: '🧵 Thread Created',
            description: `A new thread has been created: <#${thread.id}>`,
            fields: [
                { name: 'Name', value: `\`${thread.name}\``, inline: true },
                { name: 'Parent', value: `<#${thread.parentId}>`, inline: true },
                { name: 'Created By', value: executor ? `<@${executor.id}>` : 'Unknown', inline: true }
            ]
        });
    }
};
