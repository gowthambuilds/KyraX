import { Events, AuditLogEvent } from 'discord.js';
import { EventLogger } from '#utils/eventLogger';

export default {
    name: Events.GuildUpdate,
    async execute(oldGuild, newGuild, client) {
        const changes = [];

        if (oldGuild.name !== newGuild.name) changes.push({ name: 'Server Name', value: EventLogger.formatDiff(oldGuild.name, newGuild.name) });
        if (oldGuild.icon !== newGuild.icon) changes.push({ name: 'Server Icon', value: 'Server icon was updated.' });
        if (oldGuild.banner !== newGuild.banner) changes.push({ name: 'Server Banner', value: 'Server banner was updated.' });
        if (oldGuild.premiumTier !== newGuild.premiumTier) changes.push({ name: 'Boost Tier', value: EventLogger.formatDiff(oldGuild.premiumTier, newGuild.premiumTier) });

        if (changes.length === 0) return;

        const executor = await EventLogger.getExecutor(newGuild, AuditLogEvent.GuildUpdate);

        await EventLogger.log(client, newGuild, 'server', {
            title: '🎨 Server Settings Updated',
            description: `Server configuration has been modified.`,
            fields: [
                ...changes,
                { name: 'Updated By', value: executor ? `<@${executor.id}>` : 'Unknown' }
            ]
        });
    }
};
