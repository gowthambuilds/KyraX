import { KyraUI } from '#classes/KyraUI';
import { PermissionFlagsBits } from 'discord.js';
import { Guild } from '#src/database/index.js';

export default {
    name: 'autorole',
    description: 'Manage automatic role assignment for new members',
    slash: true,
    permissions: [PermissionFlagsBits.ManageGuild],
    options: [
        {
            name: 'add',
            description: 'Add a role to the autorole list',
            type: 1,
            options: [
                { name: 'role', description: 'The role to add', type: 8, required: true }
            ]
        },
        {
            name: 'remove',
            description: 'Remove a role from the autorole list',
            type: 1,
            options: [
                { name: 'role', description: 'The role to remove', type: 8, required: true }
            ]
        },
        {
            name: 'list',
            description: 'List all autoroles',
            type: 1
        },
        {
            name: 'reset',
            description: 'Clear all autoroles',
            type: 1
        }
    ],
    async execute({ client, message, interaction, args }) {
        const isSlash = !!interaction;
        if (isSlash) await interaction.deferReply({ flags: KyraUI.getFlags() });
        const guild = isSlash ? interaction.guild : message.guild;
        const subcommand = isSlash ? interaction.options.getSubcommand() : args[0]?.toLowerCase();

        // Permission Check (Executor) is handled by userPermissions in slash, but good to check for message
        if (!isSlash && !message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You need **Manage Server** permissions.`);
            return message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        const guildData = await Guild.findById(guild.id);
        const autoroles = guildData?.autoroles || [];

        if (subcommand === 'add') {
            const role = isSlash ? interaction.options.getRole('role') : message.mentions.roles.first() || guild.roles.cache.get(args[1]);

            if (!role) {
                return KyraUI.sendUsage({ client, message, interaction }, isSlash ? '/autorole add role: <role>' : `${client.prefix}autorole add <role>`);
            }

            if (role.managed) {
                const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} I cannot assign **${role.name}** because it is managed by an integration.`);
                return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
            }

            if (autoroles.includes(role.id)) {
                const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Role **${role.name}** is already in the autorole list.`);
                return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
            }

            const me = guild.members.me || await guild.members.fetchMe().catch(() => null);
            if (!me) {
                const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} I couldn't resolve my member object in this server. Try again in a moment.`);
                return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
            }

            if (role.position >= me.roles.highest.position) {
                const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} I cannot assign this role as it is higher than or equal to my highest role.`);
                return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
            }

            await Guild.findOneAndUpdate(
                { _id: guild.id },
                { $addToSet: { autoroles: role.id }, $setOnInsert: { _id: guild.id } },
                { upsert: true }
            );
            const successContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.success} Added **${role.name}** to autoroles.`);
            return isSlash ? interaction.editReply({ components: successContainer }) : message.reply({ components: successContainer, flags: KyraUI.getFlags() });
        }

        else if (subcommand === 'remove') {
            const role = isSlash ? interaction.options.getRole('role') : message.mentions.roles.first() || guild.roles.cache.get(args[1]);

            if (!role) {
                return KyraUI.sendUsage({ client, message, interaction }, isSlash ? '/autorole remove role: <role>' : `${client.prefix}autorole remove <role>`);
            }

            if (!autoroles.includes(role.id)) {
                const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Role **${role.name}** is not in the autorole list.`);
                return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
            }

            await Guild.findOneAndUpdate(
                { _id: guild.id },
                { $pull: { autoroles: role.id }, $setOnInsert: { _id: guild.id } },
                { upsert: true }
            );
            const successContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.success} Removed **${role.name}** from autoroles.`);
            return isSlash ? interaction.editReply({ components: successContainer }) : message.reply({ components: successContainer, flags: KyraUI.getFlags() });
        }

        else if (subcommand === 'list') {
            if (autoroles.length === 0) {
                const infoContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} No autoroles configured for this server.`);
                return isSlash ? interaction.editReply({ components: infoContainer }) : message.reply({ components: infoContainer, flags: KyraUI.getFlags() });
            }

            const roles = autoroles.map(id => `<@&${id}>`).join(', ');
            const container = KyraUI.buildDashboard(`### 🤖 **Autoroles**`, `Roles assigned to new members:\n\n${roles}`);
            return isSlash ? interaction.editReply({ components: container }) : message.reply({ components: container, flags: KyraUI.getFlags() });
        }

        else if (subcommand === 'reset') {
            await Guild.findOneAndUpdate(
                { _id: guild.id },
                { $set: { autoroles: [] }, $setOnInsert: { _id: guild.id } },
                { upsert: true }
            );
            const successContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.success} Successfully cleared all autoroles.`);
            return isSlash ? interaction.editReply({ components: successContainer }) : message.reply({ components: successContainer, flags: KyraUI.getFlags() });
        }

        else {
            return KyraUI.sendUsage({ client, message, interaction }, isSlash ? '/autorole <add|remove|list|reset>' : `${client.prefix}autorole <add|remove|list|reset>`);
        }
    }
};

