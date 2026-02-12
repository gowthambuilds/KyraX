import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, StringSelectMenuBuilder } from 'discord.js';

import { TicketUI } from '#classes/TicketUI';

export default {
    name: 'help',
    description: 'View all commands and bot information',
    async execute({ client, message, interaction }) {
        const isSlash = !!interaction;
        const guild = isSlash ? interaction.guild : message.guild;

        // 1. Show Loading Screen

        const loadingContainer = TicketUI.buildSimpleMessage(`${client.config.emojis.loading} **Loading Help Menu...**`);
        let response;
        if (isSlash) {
            await interaction.reply({ components: loadingContainer, flags: TicketUI.getFlags() });
        } else {
            response = await message.reply({ components: loadingContainer, flags: TicketUI.getFlags() });
        }


        // 2. Prepare Data
        const settings = await client.db.getSettings(guild.id);
        const prefix = settings.prefix || client.config.bot.prefix;

        // 3. Build Main UI
        const container = new ContainerBuilder();



        const homeContent = `## ${client.config.bot.name} | Home Page\n> Explore the available modules below.\n\n${client.config.emojis.dot} **General Commands**\n${client.config.emojis.dot} **Admin Commands**\n${client.config.emojis.dot} **Ticket System**`;

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(homeContent)
        );


        container.addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_category')
            .setPlaceholder('Select a command category')
            .addOptions([
                { label: 'Home Page', value: 'help_home', description: 'Return to the home menu.', emoji: client.config.emojis.dot },
                { label: 'General Commands', value: 'help_general', description: 'Basic commands for everyone.', emoji: client.config.emojis.dot },
                { label: 'Admin Commands', value: 'help_admin', description: 'Staff and management tools.', emoji: client.config.emojis.dot },
                { label: 'Ticket System', value: 'help_tickets', description: 'In-depth ticket management.', emoji: client.config.emojis.dot }
            ]);


        const row = new ActionRowBuilder().addComponents(selectMenu);
        const btnRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Visit Website')
                .setURL(client.config.bot.website)
                .setStyle(ButtonStyle.Link),
            new ButtonBuilder()
                .setLabel('Support Server')
                .setURL(client.config.bot.supportServer)
                .setStyle(ButtonStyle.Link)
        );


        container.addActionRowComponents(row, btnRow);


        // 4. Update with Final UI
        // Small delay to show the "loading" effect as requested
        setTimeout(async () => {
            if (isSlash) {
                await interaction.editReply({ components: [container], flags: TicketUI.getFlags() });
            } else {
                await response.edit({ components: [container], flags: TicketUI.getFlags() });
            }
        }, 1500);

    }
};

