import { 
    PermissionFlagsBits, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    EmbedBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ChannelType
} from 'discord.js';
import { TicketPanel, Ticket } from '#src/database/index.js';
import { KyraUI } from '#classes/KyraUI';
import discordTranscripts from 'discord-html-transcripts';

export default {
    name: 'ticket',
    description: 'Advanced ticket system management',
    slash: true,
    permissions: [PermissionFlagsBits.Administrator],
    options: [
        {
            name: 'setup',
            description: 'Launch the interactive ticket panel setup configuration.',
            type: 1,
            options: [
                {
                    name: 'panel_id',
                    description: 'Unique ID for the panel (Optional, defaults to "default")',
                    type: 3,
                    required: false
                }
            ]
        },
        {
            name: 'add',
            description: 'Add a user or role to the current ticket',
            type: 1,
            options: [
                {
                    name: 'user',
                    description: 'User to add',
                    type: 6,
                    required: false
                },
                {
                    name: 'role',
                    description: 'Role to add',
                    type: 8,
                    required: false
                }
            ]
        },
        {
            name: 'remove',
            description: 'Remove a user or role from the current ticket',
            type: 1,
            options: [
                {
                    name: 'user',
                    description: 'User to remove',
                    type: 6,
                    required: false
                },
                {
                    name: 'role',
                    description: 'Role to remove',
                    type: 8,
                    required: false
                }
            ]
        },
        {
            name: 'claim',
            description: 'Claim the current ticket',
            type: 1
        },
        {
            name: 'close',
            description: 'Close the current ticket and generate a transcript',
            type: 1
        }
    ],

    async execute({ client, interaction, message, args }) {
        const isSlash = !!interaction;

        const sub = isSlash ? interaction.options.getSubcommand() : args[0]?.toLowerCase();
        const guildId = isSlash ? interaction.guildId : message.guild.id;

        if (!sub) {
            return KyraUI.sendUsage({ client, message, interaction }, 'ticket <setup|add|remove|claim|close>');
        }

        switch (sub) {
            case 'setup':
                await this.handleSetup(client, interaction || message, guildId, isSlash);
                break;
            case 'add':
                await this.handleAdd(client, interaction || message, guildId, isSlash, args);
                break;
            case 'remove':
                await this.handleRemove(client, interaction || message, guildId, isSlash, args);
                break;
            case 'claim':
                await this.handleClaim(client, interaction || message, guildId, isSlash);
                break;
            case 'close':
                await this.handleClose(client, interaction || message, guildId, isSlash);
                break;
        }
    },

    async handleSetup(client, ctx, guildId, isSlash) {
        // Support custom string args for prefix or the option for slash
        let targetPanelId = 'default';
        if (isSlash) {
            const opt = ctx.options.getString('panel_id');
            if (opt) targetPanelId = opt.replace(/[^a-zA-Z0-9_-]/g, ''); // sanitize
        } else {
            // e.g. !ticket setup support_panel
            const opt = ctx.content?.split(' ')[2]; // [prefix]ticket setup [panelId]
            if (opt) targetPanelId = opt.replace(/[^a-zA-Z0-9_-]/g, '');
        }

        let panel = await TicketPanel.findOne({ guildId, panelId: targetPanelId });
        if (!panel) {
            panel = await TicketPanel.create({ guildId, panelId: targetPanelId });
        }

        // Fetch all panels for the dropdown selector
        const allPanels = await TicketPanel.find({ guildId });

        const components = this.buildSetupMainDashboard(client, panel, allPanels);
        if (isSlash) return ctx.reply({ components, flags: KyraUI.getFlags(true) });
        return ctx.reply({ components, flags: KyraUI.getFlags() });
    },

    buildSetupMainDashboard(client, panel, allPanels) {
        // We will build a UI like the screenshot:
        // Panel Name, Panel Message, Select UI Style (dropdown vs button), Status, Active Categories, Enable, etc.
        const namingText = panel.namingFormat === 'userid' ? 'User ID (e.g. ticket-123456...)' : `Number (e.g. ticket-${panel.ticketCount + 1})`;
        const staffRolesText = panel.staffRoles.length > 0 ? panel.staffRoles.map(r => `<@&${r}>`).join(', ') : 'None (Admin only)';
        const defaultCatText = panel.defaultCategoryId ? `<#${panel.defaultCategoryId}>` : 'None (No parent)';

        const description = `**Panel Name**\n\`${panel.name}\`\n\n**Panel Message**\nTitle: \`${panel.title || '*Not set*'}\`\nDescription: *${panel.description || '*Not set*'}*\n\n**Select Menu Placeholder**\n\`${panel.placeholder}\`\n\n**Settings**\nUI Style: \`${panel.uiStyle.toUpperCase()}\`\nNaming Format: \`${namingText}\`\nStatus: ${panel.status ? '✅ Active' : '❌ Inactive'}\n\n**Ticket Config**\nDefault Category: ${defaultCatText}\nStaff Roles: ${staffRolesText}\nActive Categories: ${panel.categories.length}/10\nSent To: ${panel.channelId ? `<#${panel.channelId}>` : 'Not sent yet'}`;

        const dashboardRows = KyraUI.buildDetailedDashboard(
            '🎫 Ticket Panel Configuration',
            description,
            []
        );

        // Deduplicate panels by ID just in case
        const seenIds = new Set();
        let menuOptions = allPanels
            .filter(p => {
                if (seenIds.has(p.panelId)) return false;
                seenIds.add(p.panelId);
                return true;
            })
            .map(p => ({
                label: p.name || p.panelId,
                description: `Panel ID: ${p.panelId}`,
                value: p.panelId,
                default: p.panelId === panel.panelId
            }));
        
        // Add a 'Create New' option
        menuOptions.push({
            label: 'Create New Panel...',
            description: 'Configure a brand new ticket panel',
            value: 'create_new_panel',
            emoji: '➕'
        });

        const panelSelectRow = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('ticket_config_select_panel')
                .setPlaceholder('Select a Panel to Configure')
                .addOptions(menuOptions)
        );

        const configRow1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`ticket_config_edit_name_${panel.panelId}`)
                .setLabel('Edit Name')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`ticket_config_edit_msg_${panel.panelId}`)
                .setLabel('Edit Message')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`ticket_config_edit_placeholder_${panel.panelId}`)
                .setLabel('Edit Placeholder')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`ticket_config_toggle_style_${panel.panelId}`)
                .setLabel('UI Style')
                .setStyle(ButtonStyle.Primary)
        );

        const configRow2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`ticket_config_categories_${panel.panelId}`)
                .setLabel('Categories')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`ticket_config_logs_${panel.panelId}`)
                .setLabel('Logs')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`ticket_config_toggle_naming_${panel.panelId}`)
                .setLabel('Naming Format')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`ticket_config_toggle_status_${panel.panelId}`)
                .setLabel(panel.status ? 'Disable Panel' : 'Enable Panel')
                .setStyle(panel.status ? ButtonStyle.Danger : ButtonStyle.Success)
        );

        const configRow3 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`ticket_config_staff_roles_${panel.panelId}`)
                .setLabel('Staff Roles')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`ticket_config_default_cat_${panel.panelId}`)
                .setLabel('Default Category')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`ticket_config_send_${panel.panelId}`)
                .setLabel('Send Panel')
                .setStyle(ButtonStyle.Primary)
        );

        // Inject the rows into the container directly
        dashboardRows[0].addActionRowComponents(panelSelectRow);
        dashboardRows[0].addActionRowComponents(configRow1);
        dashboardRows[0].addActionRowComponents(configRow2);
        dashboardRows[0].addActionRowComponents(configRow3);

        return [dashboardRows[0]]; // Return only the container
    },

    async handleAdd(client, ctx, guildId, isSlash, args) {
        const channelId = isSlash ? ctx.channelId : ctx.channel.id;
        const ticket = await Ticket.findOne({ guildId, channelId: channelId, status: 'open' });
        if (!ticket) {
           const err = KyraUI.buildSimpleMessage(`${client.config.emojis.error} This command can only be used in an active ticket channel.`);
           if (isSlash) return ctx.reply({ components: err, flags: KyraUI.getFlags(true) });
           return ctx.reply({ components: err, flags: KyraUI.getFlags() });
        }

        const user = isSlash ? ctx.options.getUser('user') : ctx.mentions.users.first();
        const role = isSlash ? ctx.options.getRole('role') : ctx.mentions.roles.first();

        if (!user && !role) {
            const err = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Please provide a user or role to add.`);
            if (isSlash) return ctx.reply({ components: err, flags: KyraUI.getFlags(true) });
            return ctx.reply({ components: err, flags: KyraUI.getFlags() });
        }

        try {
            if (user) {
                await ctx.channel.permissionOverwrites.edit(user.id, {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true
                });
                ticket.users.push(user.id);
            }
            if (role) {
                await ctx.channel.permissionOverwrites.edit(role.id, {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true
                });
            }
            
            await ticket.save();
            const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.success} Successfully added ${user ? `<@${user.id}>` : ''} ${role ? `<@${role.id}>` : ''} to the ticket.`);
            await ctx.reply({ components: msg });
        } catch (e) {
            client.logger.error('Ticket Add Error', e);
            const err = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Failed to add user/role. Check my permissions.`);
            if (isSlash) return ctx.reply({ components: err, flags: KyraUI.getFlags(true) });
            return ctx.reply({ components: err, flags: KyraUI.getFlags() });
        }
    },

    async handleRemove(client, ctx, guildId, isSlash, args) {
        const channelId = isSlash ? ctx.channelId : ctx.channel.id;
        const ticket = await Ticket.findOne({ guildId, channelId: channelId, status: 'open' });
        if (!ticket) {
            const err = KyraUI.buildSimpleMessage(`${client.config.emojis.error} This command can only be used in an active ticket channel.`);
            if (isSlash) return ctx.reply({ components: err, flags: KyraUI.getFlags(true) });
            return ctx.reply({ components: err, flags: KyraUI.getFlags() });
        }

        const user = isSlash ? ctx.options.getUser('user') : ctx.mentions.users.first();
        const role = isSlash ? ctx.options.getRole('role') : ctx.mentions.roles.first();

        if (!user && !role) {
            const err = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Please provide a user or role to remove.`);
            if (isSlash) return ctx.reply({ components: err, flags: KyraUI.getFlags(true) });
            return ctx.reply({ components: err, flags: KyraUI.getFlags() });
        }

        // Prevent removing the original author
        if (user && user.id === ticket.userId) {
            const err = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You cannot remove the ticket creator.`);
            if (isSlash) return ctx.reply({ components: err, flags: KyraUI.getFlags(true) });
            return ctx.reply({ components: err, flags: KyraUI.getFlags() });
        }

        try {
            if (user) {
                await ctx.channel.permissionOverwrites.delete(user.id);
                ticket.users = ticket.users.filter(u => u !== user.id);
            }
            if (role) {
                await ctx.channel.permissionOverwrites.delete(role.id);
            }
            
            await ticket.save();
            const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.success} Successfully removed ${user ? `<@${user.id}>` : ''} ${role ? `<@&${role.id}>` : ''} from the ticket.`);
            await ctx.reply({ components: msg });
        } catch (e) {
            client.logger.error('Ticket Remove Error', e);
            const err = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Failed to remove user/role. Check my permissions.`);
            if (isSlash) return ctx.reply({ components: err, flags: KyraUI.getFlags(true) });
            return ctx.reply({ components: err, flags: KyraUI.getFlags() });
        }
    },

    async handleClaim(client, ctx, guildId, isSlash) {
        const channelId = isSlash ? ctx.channelId : ctx.channel.id;
        const ticket = await Ticket.findOne({ guildId, channelId: channelId, status: 'open' });
        if (!ticket) {
            const err = KyraUI.buildSimpleMessage(`${client.config.emojis.error} This command can only be used in an active ticket channel.`);
            if (isSlash) return ctx.reply({ components: err, flags: KyraUI.getFlags(true) });
            return ctx.reply({ components: err, flags: KyraUI.getFlags() });
        }

        if (ticket.claimedBy) {
            const err = KyraUI.buildSimpleMessage(`${client.config.emojis.error} This ticket is already claimed by <@${ticket.claimedBy}>.`);
            if (isSlash) return ctx.reply({ components: err, flags: KyraUI.getFlags(true) });
            return ctx.reply({ components: err, flags: KyraUI.getFlags() });
        }

        // Add claim logic (modify permissions if needed, save to db)
        const authorId = isSlash ? ctx.user.id : ctx.author.id;
        ticket.claimedBy = authorId;
        await ticket.save();

        const claimEmbed = KyraUI.buildSimpleMessage(`${client.config.emojis.success} Ticket successfully claimed by <@${authorId}>.`);
        await ctx.reply({ components: claimEmbed });
    },

    async handleClose(client, ctx, guildId, isSlash) {
        const channelId = isSlash ? ctx.channelId : ctx.channel.id;
        const channel = isSlash ? ctx.channel : ctx.channel;
        const authorId = isSlash ? ctx.user.id : ctx.author.id;
        const author = isSlash ? ctx.user : ctx.author;
        const guild = isSlash ? ctx.guild : ctx.guild;

        const ticket = await Ticket.findOne({ guildId, channelId: channelId, status: 'open' });
        if (!ticket) {
            const err = KyraUI.buildSimpleMessage(`${client.config.emojis.error} This command can only be used in an active ticket channel.`);
            if (isSlash) return ctx.reply({ components: err, flags: KyraUI.getFlags(true) });
            return ctx.reply({ components: err, flags: KyraUI.getFlags() });
        }

        // Send intermediate reply because creating transcripts can take a moment
        let replyMsg = null;
        if (isSlash) {
            await ctx.deferReply();
        } else {
            replyMsg = await ctx.reply({ content: `${client.config.emojis.loading} Saving transcript and closing ticket...` });
        }

        ticket.status = 'closed';
        await ticket.save();

        const panel = await TicketPanel.findOne({ guildId, panelId: ticket.panelId });
        
        try {
            const attachment = await discordTranscripts.createTranscript(channel, {
                limit: -1,
                returnType: 'attachment',
                filename: `ticket-${channel.name}.html`,
                saveImages: true,
                poweredBy: false
            });

            // Try to find a log channel
            if (panel && panel.logChannels && panel.logChannels.length > 0) {
                for (const logId of panel.logChannels) {
                    const logChannel = guild.channels.cache.get(logId);
                    if (logChannel) {
                        const embed = new EmbedBuilder()
                            .setTitle('Ticket Closed')
                            .setColor(client.config.colors.secondary)
                            .addFields(
                                { name: 'Ticket Creator', value: `<@${ticket.userId}>`, inline: true },
                                { name: 'Closed By', value: `<@${authorId}>`, inline: true },
                                { name: 'Claimed By', value: ticket.claimedBy ? `<@${ticket.claimedBy}>` : 'None', inline: true }
                            )
                            .setTimestamp();
                        await logChannel.send({ embeds: [embed], files: [attachment] });
                    }
                }
            } else {
                // If no log channel, DM the person closing it.
                await author.send({ content: `Transcript for \`${channel.name}\``, files: [attachment] }).catch(() => {});
            }

            if (isSlash) await ctx.followUp({ content: 'Ticket will be deleted in 5 seconds...', ephemeral: true });
            else if (replyMsg) await replyMsg.edit({ content: 'Ticket will be deleted in 5 seconds...' });

            setTimeout(() => {
                channel.delete().catch(() => {});
            }, 5000);

        } catch (error) {
            client.logger.error('Ticket Close Error', error);
            if (isSlash) await ctx.followUp({ content: 'Failed to generate transcript or delete channel.', ephemeral: true });
            else if (replyMsg) await replyMsg.edit({ content: 'Failed to generate transcript or delete channel.' });
        }
    }
};

export async function handleTicketConfig(client, interaction) {
    const parts = interaction.customId.split('_');
    const guildId = interaction.guildId;
    const customId = interaction.customId;
    const isModal = interaction.isModalSubmit();
    const isSelect = interaction.isStringSelectMenu();

    // 1. Handle Panel Selection Menu
    if (isSelect && customId === 'ticket_config_select_panel') {
        const selectedValue = interaction.values[0];
        
        if (selectedValue === 'create_new_panel') {
            const modal = new ModalBuilder()
                .setCustomId('ticket_config_create_new_panel_modal')
                .setTitle('Create New Panel ID');

            const idInput = new TextInputBuilder()
                .setCustomId('panel_id_input')
                .setLabel('Unique Panel ID (lowercase, no spaces)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('e.g. donations, appeals, support')
                .setMaxLength(20)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(idInput));
            return interaction.showModal(modal);
        } else {
            // Switch to existing panel
            const panelId = selectedValue;
            const panel = await TicketPanel.findOne({ guildId, panelId });
            if (!panel) return interaction.reply({ content: 'Panel not found', ephemeral: true });
            
            const allPanels = await TicketPanel.find({ guildId });
            const cmd = client.commands.get('ticket');
            
            const components = cmd.buildSetupMainDashboard(client, panel, allPanels);
            return interaction.update({ components });
        }
    }
    
    // 2. Handle Create New Panel Modal
    if (isModal && customId === 'ticket_config_create_new_panel_modal') {
        let newPanelId = interaction.fields.getTextInputValue('panel_id_input').replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
        if (!newPanelId) newPanelId = 'new_panel_' + Math.floor(Math.random() * 1000);
        
        let panel = await TicketPanel.findOne({ guildId, panelId: newPanelId });
        if (!panel) {
            panel = await TicketPanel.create({ guildId, panelId: newPanelId, name: `Panel ${newPanelId}` });
        }
        
        const allPanels = await TicketPanel.find({ guildId });
        const components = cmd.buildSetupMainDashboard(client, panel, allPanels);
        return interaction.update({ components });
    }

    // 4. Handle Staff Role Selection
    if (interaction.isRoleSelectMenu() && customId.startsWith('ticket_config_set_staff_')) {
        const panelId = customId.split('_')[4];
        let panel = await TicketPanel.findOne({ guildId, panelId });
        if (!panel) return interaction.reply({ content: 'Panel not found', ephemeral: true });

        panel.staffRoles = interaction.values;
        await panel.save();

        const allPanels = await TicketPanel.find({ guildId });
        const cmd = client.commands.get('ticket');
        const components = cmd.buildSetupMainDashboard(client, panel, allPanels);
        
        // We update the original dashboard message if possible, but role select usually comes from an ephemeral.
        // So we just tell them it's saved.
        return interaction.update({ content: `${client.config.emojis.success} Staff roles updated! You can close this message.`, components: [] });
    }

    // 5. Handle Default Category Selection
    if (interaction.isChannelSelectMenu() && customId.startsWith('ticket_config_set_cat_')) {
        const panelId = customId.split('_')[4];
        let panel = await TicketPanel.findOne({ guildId, panelId });
        if (!panel) return interaction.reply({ content: 'Panel not found', ephemeral: true });

        panel.defaultCategoryId = interaction.values[0];
        await panel.save();

        return interaction.update({ content: `${client.config.emojis.success} Default category updated! You can close this message.`, components: [] });
    }

    // 6. Handle standard Button/Modal config interactions
    if (!customId.startsWith('ticket_config_') && !customId.startsWith('ticket_modal_')) return;

    // Parsing logic for buttons: ticket_config_edit_name_default (length 5) OR ticket_config_send_default (length 4)
    // Parsing logic for modals: ticket_modal_name_default (length 4)
    
    const action = parts[2];
    const subAction = (parts.length === 5) ? parts[3] : null;
    const panelId = parts[parts.length - 1];

    let panel = await TicketPanel.findOne({ guildId, panelId });
    if (!panel) return interaction.reply({ content: 'Panel configuration not found.', ephemeral: true });

    const cmd = client.commands.get('ticket');

    if (!isModal) {
        // Handle Button Clicks
        switch (action) {
            case 'edit':
                if (subAction === 'name') {
                    const modal = new ModalBuilder()
                        .setCustomId(`ticket_modal_name_${panel.panelId}`)
                        .setTitle('Edit Panel Name');
                    const input = new TextInputBuilder()
                        .setCustomId('name_input')
                        .setLabel('Panel Name')
                        .setStyle(TextInputStyle.Short)
                        .setValue(panel.name)
                        .setRequired(true);
                    modal.addComponents(new ActionRowBuilder().addComponents(input));
                    await interaction.showModal(modal);
                } else if (subAction === 'msg') {
                    const modal = new ModalBuilder()
                        .setCustomId(`ticket_modal_msg_${panel.panelId}`)
                        .setTitle('Edit Panel Message');
                    const titleInput = new TextInputBuilder()
                        .setCustomId('title_input')
                        .setLabel('Embed Title')
                        .setStyle(TextInputStyle.Short)
                        .setValue(panel.title)
                        .setRequired(true);
                    const descInput = new TextInputBuilder()
                        .setCustomId('desc_input')
                        .setLabel('Embed Description')
                        .setStyle(TextInputStyle.Paragraph)
                        .setValue(panel.description)
                        .setRequired(true);
                    modal.addComponents(
                        new ActionRowBuilder().addComponents(titleInput),
                        new ActionRowBuilder().addComponents(descInput)
                    );
                    await interaction.showModal(modal);
                } else if (subAction === 'placeholder') {
                    const modal = new ModalBuilder()
                        .setCustomId(`ticket_modal_placeholder_${panel.panelId}`)
                        .setTitle('Edit Placeholder');
                    const input = new TextInputBuilder()
                        .setCustomId('placeholder_input')
                        .setLabel('Select Menu Placeholder')
                        .setStyle(TextInputStyle.Short)
                        .setValue(panel.placeholder)
                        .setRequired(true);
                    modal.addComponents(new ActionRowBuilder().addComponents(input));
                    await interaction.showModal(modal);
                }
                break;
            case 'toggle':
                if (subAction === 'style') {
                    panel.uiStyle = panel.uiStyle === 'button' ? 'select' : 'button';
                } else if (subAction === 'status') {
                    panel.status = !panel.status;
                } else if (subAction === 'naming') {
                    panel.namingFormat = panel.namingFormat === 'userid' ? 'number' : 'userid';
                }
                await panel.save();
                const allPanelsAfterToggle = await TicketPanel.find({ guildId });
                const componentsToggle = cmd.buildSetupMainDashboard(client, panel, allPanelsAfterToggle);
                await interaction.update({ components: componentsToggle });
                break;
            case 'staff': // config_staff_roles
                const roleSelect = new RoleSelectMenuBuilder()
                    .setCustomId(`ticket_config_set_staff_${panel.panelId}`)
                    .setPlaceholder('Select Staff Roles')
                    .setMinValues(0)
                    .setMaxValues(10);
                await interaction.reply({ content: 'Select the roles that should have access to ALL tickets in this panel:', components: [new ActionRowBuilder().addComponents(roleSelect)], ephemeral: true });
                break;
            case 'default': // config_default_cat
                const catSelect = new ChannelSelectMenuBuilder()
                    .setCustomId(`ticket_config_set_cat_${panel.panelId}`)
                    .setPlaceholder('Select Default Category')
                    .addChannelTypes(ChannelType.GuildCategory);
                await interaction.reply({ content: 'Select the default Discord Category where tickets will be created:', components: [new ActionRowBuilder().addComponents(catSelect)], ephemeral: true });
                break;
            case 'send':
                if (!panel.status) {
                    return interaction.reply({ content: 'Enable the panel first before sending it!', ephemeral: true });
                }
                if (panel.categories.length === 0) {
                    return interaction.reply({ content: 'Add at least one category before sending the panel!', ephemeral: true });
                }

                const embed = new EmbedBuilder()
                    .setTitle(panel.title)
                    .setDescription(panel.description)
                    .setColor(client.config.colors.primary);

                let components = [];
                if (panel.uiStyle === 'select') {
                    const select = new StringSelectMenuBuilder()
                        .setCustomId(`ticket_select_${panel.panelId}`)
                        .setPlaceholder(panel.placeholder)
                        .addOptions(panel.categories.map(c => new StringSelectMenuOptionBuilder().setLabel(c.name).setDescription(c.description || 'Open a ticket').setValue(c.id).setEmoji(c.emoji || '🎫')));
                    components.push(new ActionRowBuilder().addComponents(select));
                } else {
                    const row = new ActionRowBuilder();
                    panel.categories.slice(0, 5).forEach(c => {
                        row.addComponents(
                            new ButtonBuilder()
                                .setCustomId(`ticket_action_create_${panel.panelId}_${c.id}`)
                                .setLabel(c.name)
                                .setEmoji(c.emoji || '🎫')
                                .setStyle(ButtonStyle.Secondary)
                        );
                    });
                    components.push(row);
                }

                const sentMsg = await interaction.channel.send({ embeds: [embed], components });
                panel.channelId = interaction.channelId;
                panel.messageId = sentMsg.id;
                await panel.save();

                const allPanelsAfterSend = await TicketPanel.find({ guildId });
                const dash = cmd.buildSetupMainDashboard(client, panel, allPanelsAfterSend);
                await interaction.update({ components: dash });
                break;
            case 'categories':
                const modal = new ModalBuilder()
                    .setCustomId(`ticket_modal_category_${panel.panelId}`)
                    .setTitle('Add a Category');
                const nameInput = new TextInputBuilder()
                    .setCustomId('name_input')
                    .setLabel('Category Name')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);
                const descInput = new TextInputBuilder()
                    .setCustomId('desc_input')
                    .setLabel('Category Description')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false);
                const emojiInput = new TextInputBuilder()
                    .setCustomId('emoji_input')
                    .setLabel('Category Emoji (Optional)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false);
                modal.addComponents(
                    new ActionRowBuilder().addComponents(nameInput),
                    new ActionRowBuilder().addComponents(descInput),
                    new ActionRowBuilder().addComponents(emojiInput)
                );
                await interaction.showModal(modal);
                break;
            case 'logs':
                const logsModal = new ModalBuilder()
                    .setCustomId(`ticket_modal_logs_${panel.panelId}`)
                    .setTitle('Set Log Channel ID');
                const logInput = new TextInputBuilder()
                    .setCustomId('log_input')
                    .setLabel('Channel ID')
                    .setStyle(TextInputStyle.Short)
                    .setValue(panel.logChannels[0] || '')
                    .setRequired(false);
                logsModal.addComponents(new ActionRowBuilder().addComponents(logInput));
                await interaction.showModal(logsModal);
                break;
        }
    }
}


export async function handleTicketModal(client, interaction) {
    const parts = interaction.customId.split('_');
    const type = parts[2]; // name, msg, placeholder, category, logs
    const panelId = parts[3];

    let panel = await TicketPanel.findOne({ guildId: interaction.guildId, panelId });
    if (!panel) return;

    // Fetch command and all panels
    const cmd = client.commands.get('ticket');
    const allPanels = await TicketPanel.find({ guildId: interaction.guildId });

    if (type === 'name') {
        panel.name = interaction.fields.getTextInputValue('name_input');
    } else if (type === 'msg') {
        panel.title = interaction.fields.getTextInputValue('title_input');
        panel.description = interaction.fields.getTextInputValue('desc_input');
    } else if (type === 'placeholder') {
        panel.placeholder = interaction.fields.getTextInputValue('placeholder_input');
    } else if (type === 'category') {
        const name = interaction.fields.getTextInputValue('name_input');
        const desc = interaction.fields.getTextInputValue('desc_input');
        const emoji = interaction.fields.getTextInputValue('emoji_input');
        panel.categories.push({
            id: 'cat_' + Date.now(),
            name,
            description: desc || null,
            emoji: emoji || null,
            supportRoles: []
        });
    } else if (type === 'logs') {
        const logId = interaction.fields.getTextInputValue('log_input');
        panel.logChannels = logId ? [logId] : [];
    }

    await panel.save();
    const components = cmd.buildSetupMainDashboard(client, panel, allPanels);
    await interaction.update({ components });
}

export async function handleTicketAction(client, interaction) {
    if (interaction.isButton() && interaction.customId.startsWith('ticket_action_create_')) {
        await handleCreate(client, interaction, interaction.customId.split('_')[3], interaction.customId.split('_')[4]);
    } else if (interaction.isStringSelectMenu() && interaction.customId.startsWith('ticket_select_')) {
        await handleCreate(client, interaction, interaction.customId.split('_')[2], interaction.values[0]);
    } else if (interaction.customId === 'ticket_action_close') {
        const cmd = client.commands.get('ticket');
        await cmd.handleClose(client, interaction, interaction.guildId, true);
    } else if (interaction.customId === 'ticket_action_claim') {
        const cmd = client.commands.get('ticket');
        await cmd.handleClaim(client, interaction, interaction.guildId, true);
    }
}

async function handleCreate(client, interaction, panelId, categoryId) {
    const panel = await TicketPanel.findOne({ guildId: interaction.guildId, panelId });
    if (!panel) return interaction.reply({ content: 'Panel not found.', ephemeral: true });

    const openCount = await Ticket.countDocuments({ guildId: interaction.guildId, userId: interaction.user.id, status: 'open' });
    if (openCount >= 3) {
        return interaction.reply({ content: 'You already have too many open tickets.', ephemeral: true });
    }

    const category = panel.categories.find(c => c.id === categoryId);
    if (!category) return interaction.reply({ content: 'Category not found.', ephemeral: true });

    // Determine channel name
    let channelName = `ticket-${interaction.user.username}`;
    if (panel.namingFormat === 'number') {
        panel.ticketCount = (panel.ticketCount || 0) + 1;
        await panel.save();
        channelName = `ticket-${panel.ticketCount.toString().padStart(4, '0')}`;
    }

    // Determine parent category
    const parentId = category.discordCategoryId || panel.defaultCategoryId || null;
    
    // Add default permissions for everyone + user
    const permissionOverwrites = [
        {
            id: interaction.guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel]
        },
        {
            id: interaction.user.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
        },
        {
            id: client.user.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels]
        }
    ];

    // Add per-category support roles
    category.supportRoles.forEach(roleId => {
        permissionOverwrites.push({
            id: roleId,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
        });
    });

    // Add per-panel staff roles
    panel.staffRoles.forEach(roleId => {
        // Avoid duplicates if a role is in both
        if (!permissionOverwrites.find(p => p.id === roleId)) {
            permissionOverwrites.push({
                id: roleId,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
            });
        }
    });

    const ticketChannel = await interaction.guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: parentId || undefined,
        permissionOverwrites
    });

    await Ticket.create({
        guildId: interaction.guildId,
        channelId: ticketChannel.id,
        userId: interaction.user.id,
        panelId: panel.panelId,
        categoryId: category.id
    });

    const embed = new EmbedBuilder()
        .setTitle('Ticket Opened')
        .setDescription(`Hello <@${interaction.user.id}>, welcome to your ticket!\nSupport will be with you shortly.`)
        .setColor(client.config.colors.primary);

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('ticket_action_close')
            .setLabel('Close Ticket')
            .setEmoji('🔒')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId('ticket_action_claim')
            .setLabel('Claim Ticket')
            .setEmoji('✋')
            .setStyle(ButtonStyle.Secondary)
    );

    const pingStr = category.supportRoles.map(id => `<@&${id}>`).join(' ') + ` <@${interaction.user.id}>`;
    await ticketChannel.send({ content: pingStr, embeds: [embed], components: [row] });
    
    await interaction.reply({ content: `Your ticket has been created: <#${ticketChannel.id}>`, ephemeral: true });
}
