import { PermissionFlagsBits, AuditLogEvent } from 'discord.js';
import { Guild } from '#src/database/index.js';
import { KyraUI } from '#classes/KyraUI';

export class EventLogger {
    /**
     * Log an event to the specified channel type
     * @param {Client} client 
     * @param {import('discord.js').Guild} guild 
     * @param {string} type - one of the log types (e.g., 'message', 'member')
     * @param {Object} data - Log data
     */
    static async log(client, guild, type, { title, description, fields = [] }) {
        try {
            const guildData = await Guild.findById(guild.id);
            if (!guildData?.logging?.enabled) return;

            const channelId = guildData.logging.channels?.[type];
            if (!channelId) return;

            const channel = await guild.channels.fetch(channelId).catch(() => null);
            if (!channel || !channel.permissionsFor(client.user).has(PermissionFlagsBits.SendMessages)) return;

            const components = KyraUI.buildDetailedDashboard(title, description, fields);

            await channel.send({
                components,
                flags: KyraUI.getFlags(),
                allowedMentions: { parse: [] }
            }).catch(() => { });
        } catch (error) {
            client.logger.error('EventLogger', `Failed to log ${type} event`, error);
        }
    }

    /**
     * Helper to find the executor of an action from audit logs
     */
    static async getExecutor(guild, eventType) {
        try {
            const fetchedLogs = await guild.fetchAuditLogs({
                limit: 1,
                type: eventType,
            });
            const firstEntry = fetchedLogs.entries.first();
            if (!firstEntry) return null;

            // If the action happened more than 5 seconds ago, it's probably not from this event
            if (Date.now() - firstEntry.createdTimestamp > 5000) return null;

            return firstEntry.executor;
        } catch (e) {
            return null;
        }
    }

    /**
     * Helper to format old vs new values
     */
    static formatDiff(oldVal, newVal) {
        return `**Old:** ${oldVal ?? 'None'}\n**New:** ${newVal ?? 'None'}`;
    }
}
