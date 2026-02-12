import { Events, AuditLogEvent } from 'discord.js';
import { EventLogger } from '#utils/eventLogger';

export default {
    name: Events.ChannelUpdate,
    async execute(oldChannel, newChannel, client) {
        const { guild } = newChannel;
        if (!guild) return;

        const changes = [];
        if (oldChannel.name !== newChannel.name) changes.push({ name: 'Name', value: EventLogger.formatDiff(oldChannel.name, newChannel.name) });
        if (oldChannel.topic !== newChannel.topic) changes.push({ name: 'Topic', value: EventLogger.formatDiff(oldChannel.topic, newChannel.topic) });
        if (oldChannel.nsfw !== newChannel.nsfw) changes.push({ name: 'NSFW', value: EventLogger.formatDiff(oldChannel.nsfw, newChannel.nsfw) });
        if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) changes.push({ name: 'Slowmode', value: EventLogger.formatDiff(`${oldChannel.rateLimitPerUser}s`, `${newChannel.rateLimitPerUser}s`) });

        if (changes.length === 0) return;

        const executor = await EventLogger.getExecutor(guild, AuditLogEvent.ChannelUpdate);

        await EventLogger.log(client, guild, 'channel', {
            title: '🛠️ Channel Updated',
            description: `Update in <#${newChannel.id}>`,
            color: '#FAA61A',
            fields: [
                ...changes,
                { name: 'Updated By', value: executor ? `<@${executor.id}>` : 'Unknown' }
            ]
        });
    }
};
