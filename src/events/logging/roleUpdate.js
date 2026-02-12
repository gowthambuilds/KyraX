import { Events, AuditLogEvent, PermissionFlagsBits } from 'discord.js';
import { EventLogger } from '#utils/eventLogger';

export default {
    name: Events.GuildRoleUpdate,
    async execute(oldRole, newRole, client) {
        const { guild } = newRole;
        const changes = [];

        if (oldRole.name !== newRole.name) changes.push({ name: 'Name', value: EventLogger.formatDiff(oldRole.name, newRole.name) });
        if (oldRole.hexColor !== newRole.hexColor) changes.push({ name: 'Color', value: EventLogger.formatDiff(oldRole.hexColor, newRole.hexColor) });
        if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) {
            changes.push({ name: 'Permissions', value: 'Permissions bitfield changed (Check Audit Logs for details)' });
        }

        if (changes.length === 0) return;

        const executor = await EventLogger.getExecutor(guild, AuditLogEvent.RoleUpdate);

        await EventLogger.log(client, guild, 'role', {
            title: '🛠️ Role Updated',
            description: `Update for role <@&${newRole.id}>`,
            fields: [
                ...changes,
                { name: 'Updated By', value: executor ? `<@${executor.id}>` : 'Unknown' }
            ]
        });
    }
};
