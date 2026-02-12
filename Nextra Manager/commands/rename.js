import { PermissionFlagsBits } from 'discord.js';
import { TicketUI } from '#classes/TicketUI';

export default {
    name: 'rename',
    description: 'Rename the current ticket channel',
    options: [
        {
            name: 'name',
            description: 'The new name for the channel',
            type: 3, // STRING
            required: true
        }
    ],
    async execute({ client, message, interaction, args }) {
        const isSlash = !!interaction;
        const guild = isSlash ? interaction.guild : message.guild;
        const channel = isSlash ? interaction.channel : message.channel;
        const member = isSlash ? interaction.member : message.member;

        const settings = await client.db.getSettings(guild.id);
        const staffRoles = settings.staffRoles || [];
        const isStaff = member.roles.cache.hasAny(...staffRoles) || member.permissions.has(PermissionFlagsBits.Administrator);

        if (!isStaff) {
            const msg = 'Only staff or admins can rename tickets.';
            return isSlash ? interaction.reply({ components: TicketUI.buildSimpleMessage(msg), flags: TicketUI.getFlags(true) }) : message.reply(msg);
        }

        // Check if it's a ticket channel (very basic check by category or name pattern if needed, but here we just check if it's in the ticket category)
        const categoryId = client.config.tickets?.categoryId;
        if (channel.parentId !== categoryId) {
            const msg = 'This command can only be used in ticket channels.';
            return isSlash ? interaction.reply({ components: TicketUI.buildSimpleMessage(msg), flags: TicketUI.getFlags(true) }) : message.reply(msg);
        }

        const newName = isSlash ? interaction.options.getString('name') : args.join('-');

        if (!newName) {
            const msg = 'Please provide a new name for the ticket.';
            return isSlash ? interaction.reply({ components: TicketUI.buildSimpleMessage(msg), flags: TicketUI.getFlags(true) }) : message.reply(msg);
        }

        try {
            await channel.setName(newName);
            const msg = `Successfully renamed the ticket to **${newName}** ${client.config.emojis.check}`;

            if (isSlash) {
                await interaction.reply({ components: TicketUI.buildSimpleMessage(msg), flags: TicketUI.getFlags() });
            } else {
                await message.reply({ components: TicketUI.buildSimpleMessage(msg), flags: TicketUI.getFlags() });
            }
        } catch (error) {
            client.logger.error('Tickets', 'Failed to rename ticket', error);
            const msg = 'Failed to rename the ticket. Ensure I have the Correct permissions.';
            return isSlash ? interaction.reply({ components: TicketUI.buildSimpleMessage(msg), flags: TicketUI.getFlags(true) }) : message.reply(msg);
        }
    }
};
