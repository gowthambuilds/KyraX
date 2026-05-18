import { PermissionFlagsBits } from 'discord.js';
import { KyraUI } from '#classes/KyraUI';

export default {
    name: 'sinkbotroles',
    aliases: ['sinkreoles', 'botrolesbottom', 'sinkroles'],
    description: 'Moves all bot integration roles to the bottom of the role list.',
    permissions: [PermissionFlagsBits.ManageRoles],
    async execute({ client, message }) {
        const guild = message.guild;

        if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return message.reply({
                components: KyraUI.buildSimpleMessage(`${client.config.emojis.error} I need **Manage Roles** permission.`),
                flags: KyraUI.getFlags()
            });
        }

        // Fetch fresh roles from API
        const allRoles = await guild.roles.fetch();

        // Use role.tags.botId — the definitive way to detect auto-created bot integration roles
        const botRoles = [...allRoles.values()].filter(r =>
            r.tags?.botId &&       // has a botId tag = integration role created by a bot
            r.id !== guild.id      // not @everyone
        );

        if (botRoles.length === 0) {
            // Show all roles with their tags so we can see what's there
            const dump = [...allRoles.values()]
                .filter(r => r.id !== guild.id)
                .sort((a, b) => b.position - a.position)
                .map(r => `${client.config.emojis.dot} **${r.name}** | managed:\`${r.managed}\` | botId:\`${r.tags?.botId ?? 'none'}\` | pos:\`${r.position}\``)
                .join('\n') || 'No roles.';

            return message.reply({
                components: KyraUI.buildDetailedDashboard(
                    `### 🔍 **No Bot Integration Roles Found**`,
                    `All roles:\n\n${dump}`
                ),
                flags: KyraUI.getFlags()
            });
        }

        const loadingMsg = await message.reply({
            components: KyraUI.buildSimpleMessage(`${client.config.emojis.loading} Sinking **${botRoles.length}** bot role(s) to the bottom...`),
            flags: KyraUI.getFlags()
        });

        try {
            // Build positions: bot roles go to 1..N, all other roles stack above
            const normalRoles = [...allRoles.values()]
                .filter(r => !r.tags?.botId && r.id !== guild.id)
                .sort((a, b) => a.position - b.position); // keep relative order

            const positionData = [
                // Sink bot roles to bottom (positions 1, 2, 3...)
                ...botRoles.map((r, i) => ({ role: r.id, position: i + 1 })),
                // Stack normal roles above (positions N+1, N+2, ...)
                ...normalRoles.map((r, i) => ({ role: r.id, position: botRoles.length + 1 + i }))
            ];

            await guild.roles.setPositions(positionData);

            const roleList = botRoles.map(r => `${client.config.emojis.dot} **${r.name}**`).join('\n');

            await loadingMsg.edit({
                components: KyraUI.buildDetailedDashboard(
                    `### ${client.config.emojis.success} **Bot Roles Sunk**`,
                    `Moved **${botRoles.length}** bot role(s) to the bottom of the role list.`,
                    [{ name: '🤖 Roles Moved', value: roleList }]
                ),
                flags: KyraUI.getFlags()
            });
        } catch (err) {
            client.logger.error('SINKBOTROLES', err.message, err);
            await loadingMsg.edit({
                components: KyraUI.buildSimpleMessage(`${client.config.emojis.error} Failed: \`${err.message}\``),
                flags: KyraUI.getFlags()
            });
        }
    }
};
