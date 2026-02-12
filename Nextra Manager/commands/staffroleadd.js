import { ApplicationCommandOptionType, PermissionFlagsBits } from 'discord.js';
import { TicketUI } from '#classes/TicketUI';

export default {
    name: 'staffroleadd',
    description: 'Add roles to be pinged when a ticket is created',
    options: [
        {
            name: 'role',
            description: 'The role to add',
            type: ApplicationCommandOptionType.Role,
            required: true
        }
    ],
    async execute({ client, message, interaction, args }) {
        const isSlash = !!interaction;
        const guild = isSlash ? interaction.guild : message.guild;
        const member = isSlash ? interaction.member : message.member;

        if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            const msg = 'You need Manage Server permissions to use this command.';
            return isSlash ? interaction.reply({ components: TicketUI.buildSimpleMessage(msg), flags: TicketUI.getFlags(true) }) : message.reply(msg);
        }

        let rolesToAdd = [];

        if (isSlash) {
            const role = interaction.options.getRole('role');
            rolesToAdd.push(role);
        } else {
            // Legacy: handle multiple mentions or IDs
            if (message.mentions.roles.size > 0) {
                rolesToAdd = [...message.mentions.roles.values()];
            } else if (args && args.length > 0) {
                // Try to fetch by ID if no mentions
                for (const arg of args) {
                    const role = await guild.roles.fetch(arg).catch(() => null);
                    if (role) rolesToAdd.push(role);
                }
            }
        }

        if (rolesToAdd.length === 0) {
            const msg = 'Please provide valid role(s) to add.';
            return isSlash ? interaction.reply({ components: TicketUI.buildSimpleMessage(msg), flags: TicketUI.getFlags(true) }) : message.reply(msg);
        }

        const settings = await client.db.getSettings(guild.id);
        const currentRoles = settings.staffRoles || [];
        const newRoles = [];

        for (const role of rolesToAdd) {
            if (!currentRoles.includes(role.id)) {
                currentRoles.push(role.id);
                newRoles.push(role.name);
            }
        }

        settings.staffRoles = currentRoles;
        await client.db.saveSettings(guild.id, settings);

        const roleNames = newRoles.length > 0 ? newRoles.map(r => `**${r}**`).join(', ') : 'No new roles';
        const msg = `Successfully added ${roleNames} to the staff notification list. ${client.config.emojis.check}`;

        if (isSlash) {
            await interaction.reply({ components: TicketUI.buildSimpleMessage(msg), flags: TicketUI.getFlags() });
        } else {
            await message.reply({ components: TicketUI.buildSimpleMessage(msg), flags: TicketUI.getFlags() });
        }
    }
};
