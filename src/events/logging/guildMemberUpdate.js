import { Events, AuditLogEvent } from 'discord.js';
import { EventLogger } from '#utils/eventLogger';

export default {
    name: Events.GuildMemberUpdate,
    async execute(oldMember, newMember, client) {
        const { guild } = newMember;

        // 1. Nickname Change
        if (oldMember.nickname !== newMember.nickname) {
            const executor = await EventLogger.getExecutor(guild, AuditLogEvent.MemberUpdate);
            await EventLogger.log(client, guild, 'member', {
                title: '👤 Nickname Updated',
                description: `**${newMember.user.tag}**'s nickname was changed.`,
                color: '#5865F2',
                fields: [
                    { name: 'User', value: `<@${newMember.id}>`, inline: true },
                    { name: 'Changed By', value: executor ? `<@${executor.id}>` : 'Self / Unknown', inline: true },
                    { name: 'Changes', value: EventLogger.formatDiff(oldMember.nickname, newMember.nickname) }
                ],
                thumbnail: newMember.user.displayAvatarURL({ dynamic: true })
            });
        }

        // 2. Role Change
        const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
        const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));

        if (addedRoles.size > 0 || removedRoles.size > 0) {
            const executor = await EventLogger.getExecutor(guild, AuditLogEvent.MemberRoleUpdate);
            let roleChanges = '';
            if (addedRoles.size > 0) roleChanges += `➕ **Added:** ${addedRoles.map(r => `<@&${r.id}>`).join(', ')}\n`;
            if (removedRoles.size > 0) roleChanges += `➖ **Removed:** ${removedRoles.map(r => `<@&${r.id}>`).join(', ')}`;

            await EventLogger.log(client, guild, 'member', {
                title: '🛡️ Member Roles Updated',
                description: `Roles were updated for **${newMember.user.tag}**.`,
                color: '#5865F2',
                fields: [
                    { name: 'User', value: `<@${newMember.id}>`, inline: true },
                    { name: 'Changed By', value: executor ? `<@${executor.id}>` : 'Unknown', inline: true },
                    { name: 'Changes', value: roleChanges }
                ]
            });
        }

        // 3. Boost Status
        if (!oldMember.premiumSince && newMember.premiumSince) {
            await EventLogger.log(client, guild, 'member', {
                title: '💎 New Server Boost',
                description: `**${newMember.user.tag}** just boosted the server!`,
                color: '#F47FFF',
                fields: [
                    { name: 'User', value: `<@${newMember.id}>`, inline: true }
                ],
                thumbnail: newMember.user.displayAvatarURL({ dynamic: true })
            });
        } else if (oldMember.premiumSince && !newMember.premiumSince) {
            await EventLogger.log(client, guild, 'member', {
                title: '📉 Server Boost Removed',
                description: `**${newMember.user.tag}**'s boost has expired or was removed.`,
                color: '#F04747',
                fields: [
                    { name: 'User', value: `<@${newMember.id}>`, inline: true }
                ]
            });
        }
    }
};
