import { KyraUI } from '#classes/KyraUI';

export default {
    name: 'roleinfo',
    description: 'Displays information about a server role',
    aliases: ['ri'],
    slash: true,
    options: [
        { name: 'role', description: 'The role to view information for', type: 8, required: true }
    ],
    async execute({ client, message, interaction, args }) {
        const isSlash = !!interaction;
        const role = isSlash
            ? interaction.options.getRole('role')
            : message.mentions.roles.first() || (args?.[0] ? message.guild.roles.cache.get(args[0]) || message.guild.roles.cache.find(r => r.name.toLowerCase() === args.join(' ').toLowerCase()) : null);

        if (!role) {
            const errorData = { content: 'Please specify a valid role.', flags: KyraUI.getFlags(true) };
            return isSlash ? interaction.reply(errorData) : message.reply(errorData).then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000)).catch(() => { });
        }

        const createdAt = Math.floor(role.createdTimestamp / 1000);
        const permissions = role.permissions.toArray();
        const keyPerms = permissions.length > 0 ? permissions.slice(0, 5).join(', ') : 'None';
        const morePerms = permissions.length > 5 ? ` *+ ${permissions.length - 5} more*` : '';

        const description = `${client.config.emojis.dot} **Name:** ${role.name}\n` +
            `${client.config.emojis.dot} **ID:** \`${role.id}\`\n` +
            `${client.config.emojis.dot} **Color:** \`${role.hexColor}\`\n` +
            `${client.config.emojis.dot} **Position:** ${role.position}\n` +
            `${client.config.emojis.dot} **Created:** <t:${createdAt}:R>\n\n` +
            `**Attributes**\n` +
            `${client.config.emojis.dot} **Hoisted:** ${role.hoist ? 'Yes' : 'No'}\n` +
            `${client.config.emojis.dot} **Mentionable:** ${role.mentionable ? 'Yes' : 'No'}\n` +
            `${client.config.emojis.dot} **Managed:** ${role.managed ? 'Yes' : 'No'}\n` +
            `${client.config.emojis.dot} **Members:** ${role.members.size}\n\n` +
            `**Key Permissions**\n${keyPerms}${morePerms}`;

        const container = KyraUI.buildDashboard(
            `### 🏷️ **Role Information**`,
            description
        );

        const responseData = {
            components: container,
            flags: KyraUI.getFlags()
        };

        if (isSlash) {
            await interaction.reply(responseData);
        } else {
            await message.reply(responseData).catch(() => { });
        }
    }
};
