import { PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { AIService } from '#src/services/AIService.js';
import { KyraUI } from '#classes/KyraUI';
import { logger } from '#src/utils/logger.js';

export default {
    name: 'autobuild',
    description: 'AI-powered Auto Server Builder (WIPES EXISTING SERVER)',
    slash: true,
    permissions: [PermissionFlagsBits.Administrator],
    ownerOnly: true,
    options: [
        {
            name: 'prompt',
            description: 'Describe the server you want to build (e.g. "Valorant esports team server")',
            type: 3, // STRING
            required: true
        }
    ],
    async execute({ client, interaction, message, args }) {
        const isSlash = !!interaction;
        const prompt = isSlash ? interaction.options.getString('prompt') : args.join(' ');
        const guild = isSlash ? interaction.guild : message.guild;
        const user = isSlash ? interaction.user : message.author;

        if (!prompt) {
            return KyraUI.sendUsage({ client, message, interaction }, 'autobuild <prompt>');
        }

        const container = KyraUI.buildDashboard(
            '⚠️ WARNING: DESTRUCTIVE ACTION',
            `You are about to **WIPE** all manageable roles, categories, and channels in **${guild.name}** and replace them with an AI-generated structure.\n\nPrompt: "${prompt}"\n\nAre you absolutely sure you want to proceed?`
        );

        container[0].addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('confirm_build').setLabel('Yes, Wipe & Build').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('cancel_build').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
            )
        );

        let reply;
        if (isSlash) {
            reply = await interaction.reply({ components: container, flags: KyraUI.getFlags(), fetchReply: true });
        } else {
            reply = await message.reply({ components: container, flags: KyraUI.getFlags() });
        }

        const collector = reply.createMessageComponentCollector({
            filter: i => i.user.id === user.id && i.isButton(),
            time: 60000,
            max: 1
        });

        collector.on('collect', async i => {
            if (i.customId === 'cancel_build') {
                await i.update({ components: KyraUI.buildSimpleMessage('❌ Auto Build cancelled.') });
                return;
            }

            await i.update({ components: KyraUI.buildSimpleMessage(`⏳ Asking AI to design the server based on: "${prompt}"...`) });

            try {
                const structure = await AIService.generateServerStructure(client, prompt);
                
                if (!structure || !structure.roles || !structure.channels) {
                    const failMsg = KyraUI.buildSimpleMessage('❌ Failed to generate valid server structure from AI. The model might have returned an invalid response.');
                    await isSlash ? interaction.editReply({ components: failMsg }) : reply.edit({ components: failMsg });
                    return;
                }

                await isSlash ? interaction.editReply({ components: KyraUI.buildSimpleMessage('🧹 Wiping existing server structure...') }) : reply.edit({ components: KyraUI.buildSimpleMessage('🧹 Wiping existing server structure...') });

                // 1. Wipe Channels and Roles in parallel
                const wipePromises = [];
                const commandChannel = isSlash ? interaction.channel : message.channel;
                const channels = Array.from(guild.channels.cache.values());
                
                for (const channel of channels) {
                    if (channel.id === commandChannel.id) continue;
                    if (commandChannel.parentId && channel.id === commandChannel.parentId) continue;
                    if (channel.deletable) wipePromises.push(channel.delete().catch(() => {}));
                }

                const botRolePos = guild.members.me.roles.highest.position;
                const roles = Array.from(guild.roles.cache.values());
                for (const role of roles) {
                    if (role.id !== guild.id && !role.managed && role.position < botRolePos && role.editable) {
                        wipePromises.push(role.delete().catch(() => {}));
                    }
                }

                await Promise.all(wipePromises);

                await isSlash ? interaction.editReply({ components: KyraUI.buildSimpleMessage('🏗️ Building new server structure...') }) : reply.edit({ components: KyraUI.buildSimpleMessage('🏗️ Building new server structure...') });

                const roleMap = new Map(); // tempId -> actualId
                const catMap = new Map(); // tempId -> actualId

                // 2. Create Roles and Categories in parallel
                const creationPromises = [];

                if (structure.roles) {
                    for (const r of structure.roles) {
                        creationPromises.push((async () => {
                            try {
                                const permissions = r.permissions ? r.permissions.map(p => PermissionFlagsBits[p]).filter(Boolean) : [];
                                const newRole = await guild.roles.create({
                                    name: r.name,
                                    color: r.color || null,
                                    hoist: r.hoist || false,
                                    permissions: permissions,
                                    reason: 'Auto Server Builder AI'
                                });
                                roleMap.set(r.id, newRole.id);
                            } catch (e) {
                                logger.error('AutoBuild', `Failed to create role ${r.name}`, e);
                            }
                        })());
                    }
                }

                if (structure.categories) {
                    for (const c of structure.categories) {
                        creationPromises.push((async () => {
                            try {
                                const newCat = await guild.channels.create({
                                    name: c.name,
                                    type: ChannelType.GuildCategory,
                                    reason: 'Auto Server Builder AI'
                                });
                                catMap.set(c.id, newCat.id);
                            } catch (e) {
                                logger.error('AutoBuild', `Failed to create category ${c.name}`, e);
                            }
                        })());
                    }
                }

                await Promise.all(creationPromises);

                // 3. Create Channels in parallel
                const channelPromises = [];
                if (structure.channels) {
                    for (const ch of structure.channels) {
                        channelPromises.push((async () => {
                            try {
                                const overwrites = [];
                                
                                if (ch.permissionOverwrites) {
                                    for (const ow of ch.permissionOverwrites) {
                                        let targetId;
                                        if (ow.id === '@everyone') {
                                            targetId = guild.id;
                                        } else if (roleMap.has(ow.id)) {
                                            targetId = roleMap.get(ow.id);
                                        } else {
                                            continue;
                                        }

                                        overwrites.push({
                                            id: targetId,
                                            allow: ow.allow ? ow.allow.map(p => PermissionFlagsBits[p]).filter(Boolean) : [],
                                            deny: ow.deny ? ow.deny.map(p => PermissionFlagsBits[p]).filter(Boolean) : []
                                        });
                                    }
                                }

                                await guild.channels.create({
                                    name: ch.name,
                                    type: ch.type === 2 ? ChannelType.GuildVoice : ChannelType.GuildText,
                                    parent: ch.categoryId && catMap.has(ch.categoryId) ? catMap.get(ch.categoryId) : null,
                                    permissionOverwrites: overwrites,
                                    reason: 'Auto Server Builder AI'
                                });
                            } catch (e) {
                                logger.error('AutoBuild', `Failed to create channel ${ch.name}`, e);
                            }
                        })());
                    }
                }

                await Promise.all(channelPromises);

                const successMsg = KyraUI.buildDashboard(
                    '✨ Server Built Successfully',
                    `Your server has been constructed based on: "${prompt}"\n\nEnjoy your new setup!`
                );
                
                await (isSlash ? interaction.editReply({ components: successMsg }).catch(()=>{}) : reply.edit({ components: successMsg }).catch(()=>{}));

            } catch (error) {
                logger.error('AutoBuild', 'Error during build process', error);
                const errorMsg = KyraUI.buildSimpleMessage('❌ An error occurred during the build process.');
                await isSlash ? interaction.editReply({ components: errorMsg }).catch(()=>{}) : reply.edit({ components: errorMsg }).catch(()=>{});
            }
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time' && collected.size === 0) {
                const timeoutMsg = KyraUI.buildSimpleMessage('❌ Command timed out.');
                if (isSlash) interaction.editReply({ components: timeoutMsg }).catch(() => {});
                else reply.edit({ components: timeoutMsg }).catch(() => {});
            }
        });
    }
};
