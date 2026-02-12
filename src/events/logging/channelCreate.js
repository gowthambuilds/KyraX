import { Events, AuditLogEvent } from 'discord.js';
import { EventLogger } from '#utils/eventLogger';

export default {
    name: Events.ChannelCreate,
    async execute(channel, client) {
        const { guild } = channel;
        if (!guild) return;

        const executor = await EventLogger.getExecutor(guild, AuditLogEvent.ChannelCreate);

        const title = `📁 Channel Created`;
        const description = `A new channel has been created: <#${channel.id}>`;

        const fields = [
            { name: 'Name', value: `\`${channel.name}\``, inline: true },
            { name: 'Type', value: `\`${channel.type}\``, inline: true },
            { name: 'Created By', value: executor ? `<@${executor.id}>` : 'Unknown', inline: true }
        ];

        if (channel.parentId) {
            const parent = guild.channels.cache.get(channel.parentId);
            fields.push({ name: 'Category', value: parent ? parent.name : `\`${channel.parentId}\``, inline: true });
        }

        await EventLogger.log(client, guild, 'channel', {
            title,
            description,
            color: '#43B581',
            fields
        });
    }
};
