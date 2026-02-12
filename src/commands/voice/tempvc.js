import { PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize } from 'discord.js';
import { Guild } from '#src/database/index.js';
import { KyraUI } from '#classes/KyraUI';

export default {
    name: 'tempvc',
    description: 'Manage the temporary voice channel system',
    slash: true,
    permissions: [PermissionFlagsBits.Administrator],
    options: [
        {
            name: 'panel',
            description: 'Open the TempVC management panel',
            type: 1
        },
        {
            name: 'config',
            description: 'View current configuration',
            type: 1
        }
    ],
    async execute({ client, interaction, message, args }) {
        const isSlash = !!interaction;
        const sub = isSlash ? interaction.options.getSubcommand() : args[0]?.toLowerCase();
        const guildId = isSlash ? interaction.guildId : message.guild.id;

        const guildData = await Guild.findById(guildId);

        // Helper to reply
        const searchReply = (content, ephemeral = false) => {
            if (isSlash) return interaction.reply({ ...content, ephemeral });
            return message.reply(content);
        };

        const member = isSlash ? interaction.member : message.member;
        if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
            const error = KyraUI.buildSimpleMessage(`${client.config.emojis?.error || '❌'} You need **Administrator** permissions to use this command.`);
            return searchReply({ components: error, flags: KyraUI.getFlags(true) });
        }

        if (!sub || sub === 'panel') {
            const isEnabled = guildData.tempvc.enabled;
            const joinChannel = guildData.tempvc.joinToCreateChannelId ? `<#${guildData.tempvc.joinToCreateChannelId}>` : 'None';
            const category = guildData.tempvc.categoryId ? `<#${guildData.tempvc.categoryId}>` : 'None';

            const container = new ContainerBuilder();

            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent('### 🎙️ Temporary Voice Channels')
            );

            container.addSeparatorComponents(
                new SeparatorBuilder()
                    .setSpacing(SeparatorSpacingSize.Small)
                    .setDivider(true)
            );

            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent([
                    'Create temporary voice channels that auto-delete when empty!',
                    '',
                    `**Status:** ${isEnabled ? '🟢 Enabled' : '⚫ Disabled'}`,
                    `**Join Channel:** ${joinChannel}`,
                    `**Category:** ${category}`,
                    '',
                    'Click the button below to toggle the system.'
                ].join('\n'))
            );

            container.addSeparatorComponents(
                new SeparatorBuilder()
                    .setSpacing(SeparatorSpacingSize.Small)
                    .setDivider(false)
            );

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('tempvc_toggle')
                    .setLabel(isEnabled ? '🔴 Disable & Delete' : '🟢 Enable & Create')
                    .setStyle(isEnabled ? ButtonStyle.Danger : ButtonStyle.Success)
            );

            container.addActionRowComponents(row);

            const response = await searchReply({ components: [container], flags: KyraUI.getFlags() });

            const collector = response.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 60000,
                filter: i => i.user.id === (isSlash ? interaction.user.id : message.author.id)
            });

            collector.on('collect', async i => {
                try {
                    if (i.customId === 'tempvc_toggle') {
                        await i.deferUpdate();
                        const freshData = await Guild.findById(guildId);

                        // If currently enabled, we are disabling
                        if (freshData.tempvc.enabled) {
                            // Delete channels if they exist
                            if (freshData.tempvc.joinToCreateChannelId) {
                                try {
                                    const channel = await i.guild.channels.fetch(freshData.tempvc.joinToCreateChannelId).catch(() => null);
                                    if (channel) await channel.delete().catch(() => null);
                                } catch (e) { console.error('Error deleting VC:', e); }
                            }
                            if (freshData.tempvc.categoryId) {
                                try {
                                    const cat = await i.guild.channels.fetch(freshData.tempvc.categoryId).catch(() => null);
                                    if (cat) await cat.delete().catch(() => null);
                                } catch (e) { console.error('Error deleting Category:', e); }
                            }

                            // Update DB
                            freshData.tempvc.enabled = false;
                            freshData.tempvc.joinToCreateChannelId = null;
                            freshData.tempvc.categoryId = null;
                            await freshData.save();

                        } else {
                            // We are enabling - Create channels
                            try {
                                const category = await i.guild.channels.create({
                                    name: 'Temp Voice',
                                    type: ChannelType.GuildCategory
                                });

                                const channel = await i.guild.channels.create({
                                    name: '➕ Join to Create',
                                    type: ChannelType.GuildVoice,
                                    parent: category.id
                                });

                                freshData.tempvc.categoryId = category.id;
                                freshData.tempvc.joinToCreateChannelId = channel.id;
                                freshData.tempvc.enabled = true;
                                await freshData.save();

                            } catch (error) {
                                console.error('Failed to create channels:', error);
                                await i.followUp({ components: KyraUI.buildSimpleMessage('❌ Failed to create channels. Check my permissions!'), flags: KyraUI.getFlags(true) });
                                return; // Don't update UI if failed
                            }
                        }

                        // Refresh UI
                        const updatedEnabled = freshData.tempvc.enabled;
                        const updatedJoin = freshData.tempvc.joinToCreateChannelId ? `<#${freshData.tempvc.joinToCreateChannelId}>` : 'None';
                        const updatedCat = freshData.tempvc.categoryId ? `<#${freshData.tempvc.categoryId}>` : 'None';

                        const newContainer = new ContainerBuilder();
                        newContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent('### 🎙️ Temporary Voice Channels'));
                        newContainer.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
                        newContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent([
                            'Create temporary voice channels that auto-delete when empty!',
                            '',
                            `**Status:** ${updatedEnabled ? '🟢 Enabled' : '⚫ Disabled'}`,
                            `**Join Channel:** ${updatedJoin}`,
                            `**Category:** ${updatedCat}`,
                            '',
                            'Click the button below to toggle the system.'
                        ].join('\n')));
                        newContainer.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false));

                        const newRow = new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId('tempvc_toggle')
                                .setLabel(updatedEnabled ? '🔴 Disable & Delete' : '🟢 Enable & Create')
                                .setStyle(updatedEnabled ? ButtonStyle.Danger : ButtonStyle.Success)
                        );

                        newContainer.addActionRowComponents(newRow);

                        await i.editReply({ components: [newContainer], flags: KyraUI.getFlags() });
                    }
                } catch (e) {
                    console.error('Collector Interaction Error:', e);
                }
            });
            return;
        }

        if (sub === 'config') {
            const fields = [
                { name: 'Status', value: guildData.tempvc.enabled ? '🟢 Enabled' : '⚫ Disabled' },
                { name: 'Join Channel', value: guildData.tempvc.joinToCreateChannelId ? `<#${guildData.tempvc.joinToCreateChannelId}>` : 'Not Set' },
                { name: 'Category', value: guildData.tempvc.categoryId ? `<#${guildData.tempvc.categoryId}>` : 'Not Set' },
                { name: 'Name Format', value: `\`${guildData.tempvc.channelNameFormat}\`` },
                { name: 'Default Limit', value: `${guildData.tempvc.defaultUserLimit}` },
                { name: 'Default Bitrate', value: `${guildData.tempvc.defaultBitrate / 1000}kbps` }
            ];

            const container = KyraUI.buildDetailedDashboard(
                '⚙️ TempVC Configuration',
                'Current system settings.',
                fields
            );

            return searchReply({ components: container, flags: KyraUI.getFlags() });
        }
    }
};
