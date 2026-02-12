import { Events, AuditLogEvent } from 'discord.js';
import { EventLogger } from '#utils/eventLogger';

export default {
    name: Events.GuildRoleDelete,
    async execute(role, client) {
        const { guild } = role;
        const executor = await EventLogger.getExecutor(guild, AuditLogEvent.RoleDelete);

        await EventLogger.log(client, guild, 'role', {
            title: '🗑️ Role Deleted',
            description: `The role **${role.name}** was deleted.`,
            fields: [
                { name: 'ID', value: `\`${role.id}\`` },
                { name: 'Deleted By', value: executor ? `<@${executor.id}>` : 'Unknown' }
            ]
        });
    }
};
