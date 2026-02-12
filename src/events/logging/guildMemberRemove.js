import { Events, AuditLogEvent } from 'discord.js';
import { EventLogger } from '#utils/eventLogger';

export default {
    name: Events.GuildMemberRemove,
    async execute(member, client) {
        const { guild } = member;

        // 1. Basic Leave Log
        const leaveFields = [
            { name: 'User', value: `<@${member.id}> (\`${member.id}\`)`, inline: true },
            { name: 'Joined', value: member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown', inline: true }
        ];

        const roles = member.roles.cache.filter(r => r.name !== '@everyone').map(r => `<@&${r.id}>`).join(', ');
        if (roles) leaveFields.push({ name: 'Roles', value: roles });

        await EventLogger.log(client, guild, 'gateway', {
            title: '📤 Member Left',
            description: `**${member.user.tag}** left the server.`,
            fields: leaveFields
        });

        // 2. Kick Detection
        const executor = await EventLogger.getExecutor(guild, AuditLogEvent.MemberKick);
        if (executor) {
            await EventLogger.log(client, guild, 'moderation', {
                title: '👢 Member Kicked',
                description: `**${member.user.tag}** was kicked by <@${executor.id}>.`,
                fields: [
                    { name: 'User', value: `<@${member.id}>`, inline: true },
                    { name: 'Moderator', value: `<@${executor.id}>`, inline: true }
                ]
            });

            // Mass Kick Detection
            try {
                const logs = await guild.fetchAuditLogs({ limit: 10, type: AuditLogEvent.MemberKick });
                const recentKicks = logs.entries.filter(e => e.executorId === executor.id && (Date.now() - e.createdTimestamp < 10000));

                if (recentKicks.size >= 5) {
                    await EventLogger.log(client, guild, 'important', {
                        title: '🚨 MASS KICK DETECTED',
                        description: `**Staff Alert:** <@${executor.id}> has kicked **${recentKicks.size}** users in 10s!`,
                        fields: [{ name: 'Moderator', value: `<@${executor.id}>` }]
                    });
                }
            } catch (e) { }
        }
    }
};
