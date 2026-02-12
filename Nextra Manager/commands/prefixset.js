import { ApplicationCommandOptionType, PermissionFlagsBits } from 'discord.js';
import { TicketUI } from '#classes/TicketUI';


export default {
    name: 'prefixset',
    description: 'Change the bot prefix for this server',
    options: [
        {
            name: 'prefix',
            description: 'The new prefix',
            type: ApplicationCommandOptionType.String,
            required: true
        }
    ],
    async execute({ client, message, interaction, args }) {
        const isSlash = !!interaction;
        const guild = isSlash ? interaction.guild : message.guild;
        const member = isSlash ? interaction.member : message.member;
        const newPrefix = isSlash ? interaction.options.getString('prefix') : args[0];

        if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            const msg = 'You need Manage Server permissions to use this command.';
            return isSlash ? interaction.reply({ components: TicketUI.buildSimpleMessage(msg), flags: TicketUI.getFlags(true) }) : message.reply(msg);
        }



        if (!newPrefix) {
            const msg = 'Please provide a new prefix.';
            return isSlash ? interaction.reply({ components: TicketUI.buildSimpleMessage(msg), flags: TicketUI.getFlags(true) }) : message.reply(msg);
        }



        if (newPrefix.length > 5) {
            const msg = 'Prefix must be 5 characters or less.';
            return isSlash ? interaction.reply({ components: TicketUI.buildSimpleMessage(msg), flags: TicketUI.getFlags(true) }) : message.reply(msg);
        }



        const settings = await client.db.getSettings(guild.id);
        settings.prefix = newPrefix;
        await client.db.saveSettings(guild.id, settings);

        // Show a brief loading state as requested "any processing action"
        if (isSlash) {
            await interaction.reply({ components: TicketUI.buildSimpleMessage(`${client.config.emojis.loading} **Updating Prefix...**`), flags: TicketUI.getFlags(true) });
        } else {

            var loadS = await message.reply(`${client.config.emojis.loading} **Updating Prefix...**`);
        }

        const successMsg = `Prefix has been updated to \`${newPrefix}\``;
        setTimeout(async () => {
            if (isSlash) {
                await interaction.editReply({ components: TicketUI.buildSimpleMessage(successMsg) });
            } else {
                await loadS.edit({ content: successMsg });
            }
        }, 1000);
    }
};

