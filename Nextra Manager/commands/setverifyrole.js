import { ApplicationCommandOptionType, PermissionFlagsBits } from 'discord.js';
import { TicketUI } from '#classes/TicketUI';

export default {
    name: 'setverifyrole',
    description: 'Set the role given to verified subscribers',
    options: [
        {
            name: 'role',
            description: 'The role to assign',
            type: ApplicationCommandOptionType.Role,
            required: true
        }
    ],
    async execute({ client, message, interaction, args }) {
        const isSlash = !!interaction;
        const guild = isSlash ? interaction.guild : message.guild;
        const member = isSlash ? interaction.member : message.member;

        const role = isSlash
            ? interaction.options.getRole('role')
            : message.mentions.roles.first() || guild.roles.cache.get(args[0]);

        if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            const msg = 'You need Manage Server permissions to use this command.';
            return isSlash ? interaction.reply({ components: TicketUI.buildSimpleMessage(msg), flags: TicketUI.getFlags(true) }) : message.reply(msg);
        }

        if (!role) {
            const msg = 'Please specify a valid role.';
            return isSlash ? interaction.reply({ components: TicketUI.buildSimpleMessage(msg), flags: TicketUI.getFlags(true) }) : message.reply(msg);
        }

        const settings = await client.db.getSettings(guild.id);
        settings.verificationRoleId = role.id;
        await client.db.saveSettings(guild.id, settings);

        const msg = `${client.config.emojis.check} **Verification Role Set!**\nVerified users will receive: <@&${role.id}>`;
        if (isSlash) {
            await interaction.reply({ components: TicketUI.buildSimpleMessage(msg), flags: TicketUI.getFlags(true) });
        } else {
            await message.reply(msg);
        }
    }
};
