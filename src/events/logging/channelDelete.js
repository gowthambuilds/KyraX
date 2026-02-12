import { Events, AuditLogEvent } from 'discord.js';
import { EventLogger } from '#utils/eventLogger';

export default {
    name: Events.ChannelDelete,
    async execute(channel, client) {
        const { guild } = channel;
        if (!guild) return;

        const executor = await EventLogger.getExecutor(guild, AuditLogEvent.ChannelDelete);

        const title = `🗑️ Channel Deleted`;
        const description = `The channel **#${channel.name}** was deleted.`;

        const fields = [
            { name: 'ID', value: `\`${channel.id}\``, inline: true },
            { name: 'Type', value: `\`${channel.type}\``, inline: true },
            { name: 'Deleted By', value: executor ? `<@${executor.id}>` : 'Unknown', inline: true }
        ];

        await EventLogger.log(client, guild, 'channel', {
            title,
            description,
            color: '#F04747',
            fields
        });

        // Mass Channel Delete Detection
        if (executor) {
            try {
                const logs = await guild.fetchAuditLogs({ limit: 10, type: AuditLogEvent.ChannelDelete });
                const recentDeletes = logs.entries.filter(e => e.executorId === executor.id && (Date.now() - e.createdTimestamp < 10000));

                if (recentDeletes.size >= 5) {
                    await EventLogger.log(client, guild, 'important', {
                        title: '🚨 MASS CHANNEL DELETION',
                        description: `**Staff Alert:** <@${executor.id}> has deleted **${recentDeletes.size}** channels in 10s!`,
                        fields: [{ name: 'Moderator', value: `<@${executor.id}>` }]
                    });
                }
            } catch (e) { }
        }
    }
};
