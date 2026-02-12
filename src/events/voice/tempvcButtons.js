import { Events, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits, ChannelType, UserSelectMenuBuilder, ComponentType, StringSelectMenuBuilder } from 'discord.js';
import { TempVoiceChannel } from '#src/database/index.js';
import { TempVCUtils } from '#utils/TempVCUtils';
import { KyraUI } from '#classes/KyraUI';

export default {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        if (!interaction.isButton() && !interaction.isModalSubmit() && !interaction.isUserSelectMenu()) return;

        // Filter for TempVC interactions
        if (!interaction.customId.startsWith('tempvc_')) return;

        // Fetch DB Data
        // For buttons/menus in the channel, interaction.channelId is the key
        // But for Modals, we might not have channel context exactly same way or it might constitute a different flow.
        // Assuming interaction happens IN the voice channel's text chat.

        const tempVcData = await TempVoiceChannel.findOne({ controlPanelChannelId: interaction.channelId });

        if (!tempVcData) {
            if (!interaction.isModalSubmit()) {
                const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} This temporary channel no longer exists.`);
                return interaction.reply({ components: msg, flags: KyraUI.getFlags(true) });
            }
            return;
        }

        // Verify Owner
        if (interaction.user.id !== tempVcData.ownerId) {
            const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Only the **channel owner** can use these controls!`);
            return interaction.reply({ components: msg, flags: KyraUI.getFlags(true) });
        }

        const channel = interaction.channel; // Voice Channel (which is also Text)

        // --- BUTTONS ---
        if (interaction.isButton()) {
            switch (interaction.customId) {
                case 'tempvc_rename': {
                    const modal = new ModalBuilder()
                        .setCustomId('tempvc_modal_rename')
                        .setTitle('Rename Channel');

                    const input = new TextInputBuilder()
                        .setCustomId('name')
                        .setLabel('New Channel Name')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder(channel.name)
                        .setMaxLength(100)
                        .setRequired(true);

                    modal.addComponents(new ActionRowBuilder().addComponents(input));
                    await interaction.showModal(modal);
                    break;
                }

                case 'tempvc_limit': {
                    const modal = new ModalBuilder()
                        .setCustomId('tempvc_modal_limit')
                        .setTitle('Set User Limit');

                    const input = new TextInputBuilder()
                        .setCustomId('limit')
                        .setLabel('User Limit (0-99)')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder(channel.userLimit.toString())
                        .setMaxLength(2)
                        .setRequired(true);

                    modal.addComponents(new ActionRowBuilder().addComponents(input));
                    await interaction.showModal(modal);
                    break;
                }

                case 'tempvc_bitrate': {
                    const modal = new ModalBuilder()
                        .setCustomId('tempvc_modal_bitrate')
                        .setTitle('Set Bitrate');

                    const input = new TextInputBuilder()
                        .setCustomId('bitrate')
                        .setLabel('Bitrate (kbps)')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder(`${channel.bitrate / 1000}`)
                        .setMaxLength(3)
                        .setRequired(true);

                    modal.addComponents(new ActionRowBuilder().addComponents(input));
                    await interaction.showModal(modal);
                    break;
                }

                case 'tempvc_lock': {
                    const isLocked = !tempVcData.locked;
                    tempVcData.locked = isLocked;
                    await tempVcData.save();

                    // Update Permissions
                    await channel.permissionOverwrites.edit(interaction.guild.id, {
                        [PermissionFlagsBits.Connect]: !isLocked
                    });

                    // Update Panel
                    const panel = TempVCUtils.buildPanel(channel, interaction.member, tempVcData, client);
                    await interaction.update(panel);
                    break;
                }

                case 'tempvc_kick': {
                    const select = new UserSelectMenuBuilder()
                        .setCustomId('tempvc_select_kick')
                        .setPlaceholder('Select user to kick')
                        .setMaxValues(1);

                    const row = new ActionRowBuilder().addComponents(select);
                    const msg = KyraUI.buildDetailedDashboard(
                        `### 👢 **Kick User**`,
                        `Select a user from the menu below to kick them from your channel.`
                    );
                    await interaction.reply({ components: [...msg, row], flags: KyraUI.getFlags(true) });
                    break;
                }

                case 'tempvc_ban': {
                    const select = new UserSelectMenuBuilder()
                        .setCustomId('tempvc_select_ban')
                        .setPlaceholder('Select user to ban')
                        .setMaxValues(1);

                    const row = new ActionRowBuilder().addComponents(select);
                    const msg = KyraUI.buildDetailedDashboard(
                        `### 🚫 **Ban User**`,
                        `Select a user from the menu below to ban them from your channel.`
                    );
                    await interaction.reply({ components: [...msg, row], flags: KyraUI.getFlags(true) });
                    break;
                }
            }
        }

        // --- MODALS ---
        if (interaction.isModalSubmit()) {
            if (interaction.customId === 'tempvc_modal_rename') {
                const name = interaction.fields.getTextInputValue('name');
                await channel.setName(name);
                await interaction.deferUpdate();

                // Refresh Panel
                const panel = TempVCUtils.buildPanel(channel, interaction.member, tempVcData, client);
                await interaction.message.edit(panel); // Modals reply to interaction, but we want to update the original panel message?
                // Actually Modal interaction is separate. We can't edit the panel message directly from `interaction.update` here easily unless we fetch it.
                // We stored messageId in DB!
                const panelMsg = await channel.messages.fetch(tempVcData.controlPanelMessageId).catch(() => null);
                if (panelMsg) await panelMsg.edit(panel);

            } else if (interaction.customId === 'tempvc_modal_limit') {
                let limit = parseInt(interaction.fields.getTextInputValue('limit'));
                if (isNaN(limit) || limit < 0 || limit > 99) limit = 0;

                await channel.setUserLimit(limit);
                await interaction.deferUpdate();

                const panel = TempVCUtils.buildPanel(channel, interaction.member, tempVcData, client);
                const panelMsg = await channel.messages.fetch(tempVcData.controlPanelMessageId).catch(() => null);
                if (panelMsg) await panelMsg.edit(panel);
            } else if (interaction.customId === 'tempvc_modal_bitrate') {
                let kbps = parseInt(interaction.fields.getTextInputValue('bitrate'));
                // Bounds check typically 8 to 96 (or higher with boost)
                if (isNaN(kbps)) kbps = 64;
                if (kbps < 8) kbps = 8;
                // Max depends on tier, let's just try setting it, Discord will error if too high? Or clamp?
                // Safe max 96 for Tier 0
                // We'll multiply by 1000

                try {
                    await channel.setBitrate(kbps * 1000);
                } catch (e) {
                    const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Failed to set bitrate. Max available for this server is likely lower.`);
                    return interaction.reply({ components: msg, flags: KyraUI.getFlags(true) });
                }

                await interaction.deferUpdate();
                const panel = TempVCUtils.buildPanel(channel, interaction.member, tempVcData, client);
                const panelMsg = await channel.messages.fetch(tempVcData.controlPanelMessageId).catch(() => null);
                if (panelMsg) await panelMsg.edit(panel);
            }
        }

        // --- USER SELECT MENUS ---
        if (interaction.isUserSelectMenu()) {
            const targetUserId = interaction.values[0];
            const targetMember = await interaction.guild.members.fetch(targetUserId).catch(() => null);

            if (interaction.customId === 'tempvc_select_kick') {
                if (targetMember && targetMember.voice.channelId === channel.id) {
                    await targetMember.voice.disconnect('Kicked by channel owner');
                    const msg = KyraUI.buildSimpleMessage(`👢 Kicked <@${targetUserId}> from the channel.`);
                    await interaction.reply({ components: msg, flags: KyraUI.getFlags(true) });
                } else {
                    const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} User is not in this voice channel.`);
                    await interaction.reply({ components: msg, flags: KyraUI.getFlags(true) });
                }
            } else if (interaction.customId === 'tempvc_select_ban') {
                // Add to bannedUsers in DB
                tempVcData.bannedUsers.push(targetUserId);
                await tempVcData.save();

                // Kick if present
                if (targetMember && targetMember.voice.channelId === channel.id) {
                    await targetMember.voice.disconnect('Banned by channel owner');
                }

                // Deny Connect permission
                await channel.permissionOverwrites.edit(targetUserId, {
                    [PermissionFlagsBits.Connect]: false
                });

                const msg = KyraUI.buildSimpleMessage(`🚫 Banned <@${targetUserId}> from the channel.`);
                await interaction.reply({ components: msg, flags: KyraUI.getFlags(true) });
            }
        }
    }
};
