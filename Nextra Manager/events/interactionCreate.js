import { PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, StringSelectMenuBuilder } from 'discord.js';
import { TicketUI } from '#classes/TicketUI';

export default {
    name: 'interactionCreate',
    async execute(client, interaction) {
        if (!interaction.guild || interaction.guild.id !== client.config.bot.mainGuildId) return;

        if (interaction.isChatInputCommand()) {

            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute({ client, interaction });
            } catch (error) {
                client.logger.error('Interaction', `Error executing slash command: ${interaction.commandName}`, error);
                await interaction.reply({
                    components: TicketUI.buildSimpleMessage('There was an error executing this command!'),
                    flags: TicketUI.getFlags(true)
                }).catch(() => { });
            }
            return;
        }

        if (!interaction.isMessageComponent()) return;

        const { customId } = interaction;

        if (customId === 'ticket_create') {
            await handleTicketCreate(client, interaction);
        }

        if (customId.startsWith('ticket_close_')) {
            await handleTicketClose(client, interaction);
        }

        if (customId.startsWith('ticket_claim_')) {
            await handleTicketClaim(client, interaction);
        }

        if (customId === 'help_category') {
            await handleHelpCategory(client, interaction);
        }

    }
};

async function handleTicketCreate(client, interaction) {
    await interaction.deferReply({ flags: TicketUI.getFlags(true) });

    const selectedCategory = interaction.values[0];
    const categoryId = client.config.tickets?.categoryId;
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    const ticketId = `${guildId}_${Date.now()}`;

    const settings = await client.db.getSettings(guildId);
    const ticketNumber = (settings.ticketCount || 0) + 1;
    settings.ticketCount = ticketNumber;
    await client.db.saveSettings(guildId, settings);

    const paddedNumber = ticketNumber.toString().padStart(3, '0');
    const categoryName = selectedCategory === 'support' ? 'general' : selectedCategory;
    const channelName = `${categoryName}-${paddedNumber}`;

    const staffRoles = settings.staffRoles || [];
    const permissionOverwrites = [
        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: userId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
    ];

    staffRoles.forEach(roleId => {
        permissionOverwrites.push({
            id: roleId,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
        });
    });

    try {
        const channel = await interaction.guild.channels.create({
            name: channelName,
            parent: categoryId,
            type: ChannelType.GuildText,
            permissionOverwrites: permissionOverwrites
        });

        await client.db.saveTicket(ticketId, {
            id: ticketId,
            channelId: channel.id,
            userId: userId,
            guildId: guildId,
            status: 'open',
            createdAt: new Date().toISOString()
        });

        const staffRoles = settings.staffRoles || [];
        if (staffRoles.length > 0) {
            const mentionString = staffRoles.map(id => `<@&${id}>`).join(' ');
            await channel.send({ content: mentionString });
        }

        const welcomeMsg = `## Welcome <@${userId}>!\nPlease be patient until our staff claims the ticket to assist you. ${client.config.emojis.loading}`;
        const components = TicketUI.buildTicketActions(ticketId, welcomeMsg);

        await channel.send({
            components: components,
            flags: TicketUI.getFlags()
        });


        await interaction.editReply({
            components: TicketUI.buildConfirmation(`Ticket created: <#${channel.id}>`, 'Go to Ticket', `https://discord.com/channels/${interaction.guild.id}/${channel.id}`),
            flags: TicketUI.getFlags(true)
        });

    } catch (error) {
        client.logger.error('Tickets', 'Failed to create ticket', error);
        await interaction.editReply({
            components: TicketUI.buildSimpleMessage('Failed to create ticket.'),
            flags: TicketUI.getFlags(true)
        });
    }
}

async function handleTicketClose(client, interaction) {
    const ticketId = interaction.customId.replace('ticket_close_', '');
    const ticket = await client.db.getTicket(ticketId);

    if (!ticket) return interaction.reply({
        components: TicketUI.buildSimpleMessage('Ticket not found.'),
        flags: TicketUI.getFlags(true)
    });

    await interaction.reply({
        components: TicketUI.buildSimpleMessage(`${client.config.emojis.loading} **Closing ticket...**`),
        flags: TicketUI.getFlags(true)
    });

    try {
        const channel = await client.channels.fetch(ticket.channelId);
        if (channel) await channel.delete();
        await client.db.deleteTicket(ticketId);
    } catch (error) {
        client.logger.error('Tickets', 'Failed to close ticket', error);
    }
}

async function handleTicketClaim(client, interaction) {
    const ticketId = interaction.customId.replace('ticket_claim_', '');
    const ticket = await client.db.getTicket(ticketId);

    if (!ticket) return interaction.reply({
        components: TicketUI.buildSimpleMessage('Ticket not found.'),
        flags: TicketUI.getFlags(true)
    });

    if (ticket.claimedBy) return interaction.reply({
        components: TicketUI.buildSimpleMessage(`This ticket is already claimed by <@${ticket.claimedBy}>.`),
        flags: TicketUI.getFlags(true)
    });

    const settings = await client.db.getSettings(interaction.guild.id);
    const staffRoles = settings.staffRoles || [];
    const isStaff = interaction.member.roles.cache.hasAny(...staffRoles) || interaction.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!isStaff) return interaction.reply({
        components: TicketUI.buildSimpleMessage('Only staff or admins can claim tickets.'),
        flags: TicketUI.getFlags(true)
    });

    ticket.claimedBy = interaction.user.id;
    ticket.claimedAt = new Date().toISOString();
    await client.db.saveTicket(ticketId, ticket);

    const welcomeMsg = `## Welcome <@${ticket.userId}>!\nSupport will be with you shortly.`;
    const components = TicketUI.buildTicketActions(ticketId, welcomeMsg, interaction.user.id);

    await interaction.update({
        components: components,
        flags: TicketUI.getFlags()
    });

    const publicNotify = `## Ticket Claimed\n<@${interaction.user.id}> has claimed this ticket and will be assisting you shortly.`;
    await interaction.channel.send({
        components: TicketUI.buildSimpleMessage(publicNotify),
        flags: TicketUI.getFlags()
    });
}

async function handleHelpCategory(client, interaction) {
    const category = interaction.values[0];
    const settings = await client.db.getSettings(interaction.guild.id);
    const prefix = settings.prefix || client.config.bot.prefix;
    const guild = interaction.guild;
    const serverIcon = guild.iconURL({ dynamic: true, size: 512 });

    const container = new ContainerBuilder();
    let content = '';

    if (category === 'help_home') {
        content = `## ${client.config.bot.name} | Home Page\n> Explore the available modules below.\n\n${client.config.emojis.dot} **General Commands**\n${client.config.emojis.dot} **Admin Commands**\n${client.config.emojis.dot} **Ticket System**`;
    } else {
        let commands = [];
        let title = '';

        if (category === 'help_general') {
            title = 'General Commands';
            commands = ['ping', 'help', 'greet'];
        } else if (category === 'help_admin') {
            title = 'Admin Commands';
            commands = ['prefixset', 'panel', 'sync', 'staffroleadd', 'staffrolereset', 'feedbacks'];
        } else if (category === 'help_tickets') {



            title = 'Ticket Commands';
            commands = ['panel', 'rename'];
        }



        const commandList = client.commands
            .filter(cmd => commands.includes(cmd.name))
            .map(cmd => `**\`${prefix}${cmd.name}\`** - ${cmd.description}`)

            .join('\n');

        content = `## ${title}\n${commandList || 'No commands found.'}`;
    }

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(content)
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

    try {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.update({
                components: [container],
                flags: TicketUI.getFlags()
            });
        } else {
            await interaction.editReply({
                components: [container],
                flags: TicketUI.getFlags()
            });
        }
    } catch (error) {
        client.logger.error('Help', 'Failed to update help menu', error);
    }
}
