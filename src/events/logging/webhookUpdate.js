import { Events, AuditLogEvent } from 'discord.js';
import { EventLogger } from '#utils/eventLogger';

export default {
    name: Events.WebhooksUpdate,
    async execute(channel, client) {
        const { guild } = channel;
        if (!guild) return;

        const executor = await EventLogger.getExecutor(guild, AuditLogEvent.WebhookUpdate);

        await EventLogger.log(client, guild, 'webhook', {
            title: '⚓ Webhook Updated',
            description: `A webhook was created, deleted, or updated in <#${channel.id}>.`,
            fields: [
                { name: 'Channel', value: `<#${channel.id}>`, inline: true },
                { name: 'Updated By', value: executor ? `<@${executor.id}>` : 'Unknown', inline: true }
            ]
        });

        // Mass Webhook Detection
        if (executor) {
            try {
                const logs = await guild.fetchAuditLogs({ limit: 10, type: AuditLogEvent.WebhookCreate });
                const recentCreates = logs.entries.filter(e => e.executorId === executor.id && (Date.now() - e.createdTimestamp < 10000));

                if (recentCreates.size >= 5) {
                    await EventLogger.log(client, guild, 'important', {
                        title: '🚨 WEBHOOK SPAM ATTEMPT',
                        description: `**Staff Alert:** <@${executor.id}> is creating mass webhooks in <#${channel.id}>!`,
                        fields: [{ name: 'Moderator', value: `<@${executor.id}>` }]
                    });
                }
            } catch (e) { }
        }
    }
};
