import { KyraUI } from '#classes/KyraUI';
import { PermissionFlagsBits } from 'discord.js';

export default {
    name: 'role',
    description: 'Advanced role management',
    aliases: ['r'],
    slash: true,
    options: [
        {
            name: 'toggle',
            description: 'Toggles a role for a member',
            type: 1,
            options: [
                { name: 'user', description: 'The user to manage roles for', type: 6, required: true },
                { name: 'role', description: 'The role to toggle', type: 8, required: true }
            ]
        },
        {
            name: 'create',
            description: 'Create a new role',
            type: 1,
            options: [
                { name: 'name', description: 'The name of the new role', type: 3, required: true },
                { name: 'color', description: 'The hex color for the role (e.g., #ff0000)', type: 3, required: false }
            ]
        },
        {
            name: 'delete',
            description: 'Delete an existing role',
            type: 1,
            options: [
                { name: 'role', description: 'The role to delete', type: 8, required: true }
            ]
        }
    ],
    async execute({ client, message, interaction, args }) {
        const isSlash = !!interaction;
        if (isSlash) await interaction.deferReply({ flags: KyraUI.getFlags() });
        const guild = isSlash ? interaction.guild : message.guild;
        const executor = isSlash ? interaction.member : message.member;

        if (!executor.permissions.has(PermissionFlagsBits.ManageRoles)) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You need **Manage Roles** permissions.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} I need **Manage Roles** permissions.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        const subcommand = isSlash ? interaction.options.getSubcommand() : null;
        const prefixFirstArg = !isSlash ? args[0]?.toLowerCase() : null;

        // CREATE
        if (subcommand === 'create' || prefixFirstArg === 'create') {
            const name = isSlash ? interaction.options.getString('name') : args.slice(1).join(' ');
            const color = isSlash ? interaction.options.getString('color') : null;

            if (!name) {
                return KyraUI.sendUsage({ client, message, interaction }, isSlash ? '/role create name: <name> [color: color]' : `${client.prefix}role create <name> [color]`);
            }

            try {
                const roleOptions = {
                    name,
                    reason: `Created by ${executor.user.tag}`
                };

                // Only add color if it's a valid hex color
                if (color && /^#[0-9A-F]{6}$/i.test(color)) {
                    roleOptions.color = color;
                }

                const role = await guild.roles.create(roleOptions);

                const successContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.success} Successfully created role **${role.name}**.`);
                return isSlash ? interaction.editReply({ components: successContainer }) : message.reply({ components: successContainer, flags: KyraUI.getFlags() });
            } catch (error) {
                client.logger.error('Role', 'Failed to create role', error);
                const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Failed to create role. Check if I have high enough permissions.`);
                return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
            }
        }

        // DELETE
        else if (subcommand === 'delete' || prefixFirstArg === 'delete') {
            const role = isSlash ? interaction.options.getRole('role') : message.mentions.roles.first() || guild.roles.cache.get(args[1]);

            if (!role) {
                return KyraUI.sendUsage({ client, message, interaction }, isSlash ? '/role delete role: <role>' : `${client.prefix}role delete <role>`);
            }

            if (role.position >= guild.members.me.roles.highest.position) {
                const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} I cannot delete this role as it is higher than or equal to my highest role.`);
                return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
            }

            try {
                await role.delete(`Deleted by ${executor.user.tag}`);
                const successContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.success} Successfully deleted the role.`);
                return isSlash ? interaction.editReply({ components: successContainer }) : message.reply({ components: successContainer, flags: KyraUI.getFlags() });
            } catch (error) {
                client.logger.error('Role', 'Failed to delete role', error);
                const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Failed to delete role.`);
                return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
            }
        }

        // TOGGLE (USER)
        else {
            const isExplicitToggle = prefixFirstArg === 'toggle';
            const targetMember = isSlash
                ? interaction.options.getMember('user')
                : message.mentions.members.filter(m => message.content.includes(m.id)).first();

            const roleArgIndex = isExplicitToggle ? 2 : 1;
            const role = isSlash
                ? interaction.options.getRole('role')
                : message.mentions.roles.first() || guild.roles.cache.get(args[roleArgIndex]) || guild.roles.cache.find(r => r.name.toLowerCase() === args.slice(roleArgIndex).join(' ').toLowerCase());

            if (!targetMember || !role) {
                return KyraUI.sendUsage({ client, message, interaction }, isSlash ? '/role toggle user: <user> role: <role>' : `${client.prefix}role <user> <role>`);
            }

            if (role.managed) {
                const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} This role is managed by Discord (bot role, booster role, etc.) and cannot be manually assigned.`);
                return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
            }

            if (role.position >= guild.members.me.roles.highest.position) {
                const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} I cannot manage this role as it is higher than or equal to my highest role.`);
                return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
            }

            if (role.position >= executor.roles.highest.position && guild.ownerId !== executor.id) {
                const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You cannot manage this role as it is higher than or equal to your highest role.`);
                return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
            }

            try {
                const hasRole = targetMember.roles.cache.has(role.id);
                if (hasRole) {
                    await targetMember.roles.remove(role, `Moderator: ${executor.user.tag}`);
                    const successContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.success} Removed role **${role.name}** from **${targetMember.user.username}**.`);
                    return isSlash ? interaction.editReply({ components: successContainer }) : message.reply({ components: successContainer, flags: KyraUI.getFlags() });
                } else {
                    await targetMember.roles.add(role, `Moderator: ${executor.user.tag}`);
                    const successContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.success} Added role **${role.name}** to **${targetMember.user.username}**.`);
                    return isSlash ? interaction.editReply({ components: successContainer }) : message.reply({ components: successContainer, flags: KyraUI.getFlags() });
                }
            } catch (error) {
                client.logger.error('Role', 'Failed to manage roles', error);

                // Provide more specific error messages
                let errorMsg = `${client.config.emojis.error} Failed to manage roles.`;
                if (error.code === 50013) {
                    errorMsg = `${client.config.emojis.error} Missing permissions. The role might be higher than my highest role or I lack the Manage Roles permission.`;
                } else if (error.code === 50001) {
                    errorMsg = `${client.config.emojis.error} I don't have access to that member or role.`;
                }

                const errorContainer = KyraUI.buildSimpleMessage(errorMsg);
                return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
            }
        }
    }
};


