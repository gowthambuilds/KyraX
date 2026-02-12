import { Events, AuditLogEvent } from 'discord.js';
import { EventLogger } from '#utils/eventLogger';

export default {
    name: Events.GuildScheduledEventCreate,
    async execute(event, client) {
        const { guild } = event;
        const executor = await EventLogger.getExecutor(guild, AuditLogEvent.GuildScheduledEventCreate);

        await EventLogger.log(client, guild, 'event', {
            title: '📅 Event Scheduled',
            description: `A new server event has been scheduled: **${event.name}**`,
            fields: [
                { name: 'Location', value: event.entityMetadata?.location || `<#${event.channelId}>`, inline: true },
                { name: 'Start Time', value: `<t:${Math.floor(event.scheduledStartTimestamp / 1000)}:f>`, inline: true },
                { name: 'Created By', value: executor ? `<@${executor.id}>` : 'Unknown', inline: true }
            ]
        });
    }
};
