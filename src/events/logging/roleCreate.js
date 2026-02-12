import { Events, AuditLogEvent } from 'discord.js';
import { EventLogger } from '#utils/eventLogger';

export default {
    name: Events.GuildRoleCreate,
    async execute(role, client) {
        const { guild } = role;
        const executor = await EventLogger.getExecutor(guild, AuditLogEvent.RoleCreate);

        await EventLogger.log(client, guild, 'role', {
            title: '🏷️ Role Created',
            description: `A new role has been created: <@&${role.id}>`,
            fields: [
                { name: 'Name', value: `\`${role.name}\`` },
                { name: 'Created By', value: executor ? `<@${executor.id}>` : 'Unknown' }
            ]
        });
    }
};
