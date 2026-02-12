import { Events, AuditLogEvent } from 'discord.js';
import { EventLogger } from '#utils/eventLogger';

export default {
    name: Events.GuildBanAdd,
    async execute(ban, client) {
        const { guild, user } = ban;

        // 1. Regular Moderation Log (handled by modLogger usually, but we also put it in moderation-logs)
        const executor = await EventLogger.getExecutor(guild, AuditLogEvent.MemberBanAdd);

        await EventLogger.log(client, guild, 'moderation', {
            title: '🔨 Member Banned',
            description: `**${user.tag}** was banned from the server.`,
            fields: [
                { name: 'User', value: `<@${user.id}> (\`${user.id}\`)`, inline: true },
                { name: 'Moderator', value: executor ? `<@${executor.id}>` : 'Unknown', inline: true },
                { name: 'Reason', value: ban.reason || 'No reason provided' }
            ]
        });

        // 2. Important Logs: Mass Ban Detection
        // Check audit logs for recent bans by the same executor
        try {
            const recentBans = await guild.fetchAuditLogs({
                limit: 10,
                type: AuditLogEvent.MemberBanAdd
            });

            if (executor) {
                const bansByExecutor = recentBans.entries.filter(e => e.executorId === executor.id && (Date.now() - e.createdTimestamp < 10000));

                if (bansByExecutor.size >= 5) {
                    await EventLogger.log(client, guild, 'important', {
                        title: '🚨 MASS BAN DETECTED',
                        description: `**MODERATOR ALERT:** <@${executor.id}> has banned **${bansByExecutor.size}** members in the last 10 seconds!`,
                        fields: [
                            { name: 'Moderator', value: `<@${executor.id}> (\`${executor.tag}\`)` },
                            { name: 'Action', value: 'High frequency banning detected. Possible compromise or rogue staff.' }
                        ]
                    });
                }
            }
        } catch (e) { }
    }
};
