import { Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';
import { KyraUI } from '#classes/KyraUI';
import { Guild } from '#src/database/index.js';

export default {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        // Fetch Guild settings
        const guildSettings = await Guild.findById(interaction.guildId).lean();
        
        // Check for maintenance mode
        if (interaction.isChatInputCommand() && client.maintenanceMode) {
            const maintenanceContainer = KyraUI.buildSimpleMessage(`⚙️ **Under Maintenance**\n\nSorry for the inconvenience! **Kyra X** is undergoing regular maintenance.\n\nIt will be back soon with better updates and bug fixes.`);

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ components: maintenanceContainer, flags: KyraUI.getFlags(true) });
            } else {
                const response = await interaction.reply({ components: maintenanceContainer, flags: KyraUI.getFlags(true), fetchReply: true });
                setTimeout(() => response.delete().catch(() => { }), 5000);
            }
            return;
        }

        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            // --- Ignore Logic Check (Commands Only) ---
            const isOwner = client.config.ownerId.includes(interaction.user.id);
            const isAdmin = interaction.member?.permissions.has(PermissionFlagsBits.Administrator);
            const isIgnored = !isOwner && !isAdmin && (
                guildSettings?.ignored?.channels?.includes(interaction.channelId) || 
                guildSettings?.ignored?.users?.includes(interaction.user.id) || 
                interaction.member?.roles?.cache.some(r => guildSettings?.ignored?.roles?.includes(r.id))
            );

            if (isIgnored && command.name !== 'afk') return;

            if (command.ownerOnly && !isOwner) {
                const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} This command is **owner-only**.`);
                return interaction.reply({ components: msg, flags: KyraUI.getFlags(true) });
            }

            // Check permissions
            if (command.permissions && command.permissions.length > 0) {
                const missingPerms = command.permissions.filter(perm => !interaction.member?.permissions.has(perm));
                if (missingPerms.length > 0 && !isOwner) {
                    const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You do not have permission to use this command.`);
                    return interaction.reply({ components: msg, flags: KyraUI.getFlags(true) });
                }
            }

            try {
                await command.execute({ client, interaction });
                const args = interaction.options.data.map(o => o.value);
                client.emit('commandUsed', { client, interaction, commandName: command.name, args }, client);
            } catch (error) {
                client.logger.error('InteractionCreate', `Error executing slash command: ${interaction.commandName}`, error);

                const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} There was an error while executing this command!`);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ components: msg, flags: KyraUI.getFlags(true) });
                } else {
                    await interaction.reply({ components: msg, flags: KyraUI.getFlags(true) });
                }
            }
        }

        if (interaction.isButton()) {
            if (interaction.customId.startsWith('help_button')) {
                const helpCommand = client.commands.get('help');
                if (helpCommand) {
                    await helpCommand.execute({ client, interaction });
                }
            }

            if (interaction.customId === 'giveaway_enter') {
                await client.giveaways.handleEntry(interaction);
            }

            if (interaction.customId === 'giveaway_participants') {
                const { GiveawayEntry } = await import('#src/database/index.js');
                const { KyraUI } = await import('#classes/KyraUI');

                const entries = await GiveawayEntry.find({ giveawayId: interaction.message.id });
                if (entries.length === 0) {
                    const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.dot} No one has participated in this giveaway yet.`);
                    return interaction.reply({ components: msg, flags: KyraUI.getFlags(true) });
                }

                const participants = entries.map(e => `<@${e.userId}>`).join(', ');
                const container = KyraUI.buildDetailedDashboard(
                    `### 👥 **Giveaway Participants**`,
                    `Total Participants: **${entries.length}**\n\n${participants.length > 3900 ? participants.substring(0, 3900) + '...' : participants}`
                );

                await interaction.reply({ components: container, flags: KyraUI.getFlags(true) });
            }

            // Music Player Buttons
            if (interaction.customId.startsWith('player_')) {
                const player = client.lavalink.kazagumo.players.get(interaction.guildId);
                if (!player) {
                    const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} No active player found.`);
                    return interaction.reply({ components: msg, flags: KyraUI.getFlags(true) });
                }

                if (interaction.member.voice.channelId !== player.voiceId) {
                    const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You must be in the same voice channel as me to use controls.`);
                    return interaction.reply({ components: msg, flags: KyraUI.getFlags(true) });
                }

                const discoveryKeywords = ['lofi', 'slowed and reverb', 'trending hits 2024', 'hip hop beats', 'coding chill', 'popular pop', 'indie folk'];
                const getRandomKeyword = () => discoveryKeywords[Math.floor(Math.random() * discoveryKeywords.length)];

                switch (interaction.customId) {
                    case 'player_previous': {
                        const keyword = getRandomKeyword();
                        const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.loading} Discovering a random track for you (\`${keyword}\`)...`);
                        await interaction.reply({ components: msg, flags: KyraUI.getFlags(true) });

                        const result = await client.lavalink.kazagumo.search(keyword, { requester: interaction.user });
                        if (!result.tracks.length) {
                            const errorMsg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Could not find any random tracks at the moment.`);
                            return interaction.followUp({ components: errorMsg, flags: KyraUI.getFlags(true) });
                        }

                        player.play(result.tracks[Math.floor(Math.random() * Math.min(result.tracks.length, 10))]);
                        break;
                    }
                    case 'player_skip': {
                        if (player.queue.size > 0) {
                            player.skip();
                            const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.music} **Skipped!** Playing next in queue.`);
                            await interaction.reply({ components: msg, flags: KyraUI.getFlags(true) });
                        } else {
                            // Queue is empty, trigger related-song discovery (Autoplay logic)
                            const currentTrack = player.queue.current;
                            if (!currentTrack) {
                                const errorMsg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} No track currently playing.`);
                                return interaction.reply({ components: errorMsg, flags: KyraUI.getFlags(true) });
                            }

                            const keyword = getRandomKeyword();
                            const query = keyword; // Broader search to avoid loops
                            const loadingMsg = KyraUI.buildSimpleMessage(`${client.config.emojis.loading} Discovering fresh **${keyword}** tracks for you...`);
                            await interaction.reply({ components: loadingMsg, flags: KyraUI.getFlags(true) });

                            try {
                                const searchResult = await client.lavalink.kazagumo.search(query, { requester: interaction.user });
                                if (searchResult.tracks.length > 0) {
                                    // Use filter to ensure we don't accidentally get the same song
                                    const filteredTracks = searchResult.tracks.filter(t =>
                                        t.uri !== currentTrack.uri &&
                                        t.title.toLowerCase() !== currentTrack.title.toLowerCase()
                                    );

                                    // Pick random track from top results for variety
                                    const nextTrack = filteredTracks.length > 0
                                        ? filteredTracks[Math.floor(Math.random() * Math.min(filteredTracks.length, 5))]
                                        : searchResult.tracks[0];

                                    player.play(nextTrack);
                                } else {
                                    const errorMsg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Could not find any tracks for \`${keyword}\`.`);
                                    await interaction.followUp({ components: errorMsg, flags: KyraUI.getFlags(true) });
                                }
                            } catch (error) {
                                client.logger.error('Music', 'Manual discovery skip failed', error);
                                const errorMsg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Failed to discover tracks.`);
                                await interaction.followUp({ components: errorMsg, flags: KyraUI.getFlags(true) });
                            }
                        }
                        break;
                    }
                    case 'player_pause':
                        player.pause(!player.paused);
                        const { MusicUtils } = await import('#utils/MusicUtils');
                        const updatedPanel = MusicUtils.getPlayerPanel(client, player, player.queue.current);
                        await interaction.update(updatedPanel);
                        break;
                    case 'player_stop':
                        player.destroy();
                        const stopMsg = KyraUI.buildSimpleMessage(`${client.config.emojis.success} Stopped playing and left the channel.`);
                        await interaction.reply({ components: stopMsg, flags: KyraUI.getFlags(true) });
                        break;
                }
            }

            if (interaction.customId.startsWith('poll_vote_')) {
                const { Poll } = await import('#src/database/index.js');
                const { KyraUI } = await import('#classes/KyraUI');

                const pollIndex = parseInt(interaction.customId.replace('poll_vote_', ''));
                const pollData = await Poll.findOne({ messageId: interaction.message.id });

                if (!pollData) {
                    const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Poll data not found.`);
                    return interaction.reply({ components: msg, flags: KyraUI.getFlags(true) });
                }
                if (pollData.closed) {
                    const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} This poll is **closed**.`);
                    return interaction.reply({ components: msg, flags: KyraUI.getFlags(true) });
                }

                // Check if user already voted
                const alreadyVoted = pollData.options.some(opt => opt.votes.includes(interaction.user.id));
                if (alreadyVoted) {
                    const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.dot} You have **already voted** in this poll.`);
                    return interaction.reply({ components: msg, flags: KyraUI.getFlags(true) });
                }

                // Add vote
                pollData.options[pollIndex].votes.push(interaction.user.id);
                await pollData.save();

                // Calculate results
                const totalVotes = pollData.options.reduce((acc, opt) => acc + opt.votes.length, 0);
                const fields = pollData.options.map((opt, index) => {
                    const percentage = totalVotes === 0 ? 0 : Math.round((opt.votes.length / totalVotes) * 100);
                    return {
                        name: `Option ${index + 1}`,
                        value: `${opt.label}\n${client.config.emojis.dot} **Votes:** ${opt.votes.length} (${percentage}%)`
                    };
                });

                const updatedContainer = KyraUI.buildDetailedDashboard(
                    `### 📊 **Poll Results**`,
                    `**${pollData.question}**`,
                    fields
                );

                await interaction.update({
                    components: [...updatedContainer, interaction.message.components[interaction.message.components.length - 1]]
                });
            }
        }

        if (interaction.isStringSelectMenu()) {
            if (interaction.customId.startsWith('help_category')) {
                const helpCommand = client.commands.get('help');
                if (helpCommand) {
                    await helpCommand.execute({ client, interaction });
                }
            }

            if (interaction.customId === 'player_filter') {
                const player = client.lavalink.kazagumo.players.get(interaction.guildId);
                if (!player) {
                    const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} No active player found.`);
                    return interaction.reply({ components: msg, flags: KyraUI.getFlags(true) });
                }

                if (interaction.member.voice.channelId !== player.voiceId) {
                    const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You must be in the same voice channel as me to adjust filters.`);
                    return interaction.reply({ components: msg, flags: KyraUI.getFlags(true) });
                }

                // Reset filters initially for a clean state (transition)
                player.shoukaku.setFilters({});

                const filter = interaction.values[0];
                let filterName = 'Unknown';
                let filterData = {};

                switch (filter) {
                    case 'filter_reset':
                        filterData = {
                            equalizer: [
                                { band: 0, gain: 0.10 },
                                { band: 1, gain: 0.10 },
                                { band: 2, gain: 0.05 },
                                { band: 12, gain: 0.10 },
                                { band: 13, gain: 0.15 }
                            ]
                        };
                        filterName = 'Default Equalizer';
                        break;
                    case 'filter_bassboost':
                        filterData = {
                            equalizer: [
                                { band: 0, gain: 0.70 },
                                { band: 1, gain: 0.70 },
                                { band: 2, gain: 0.60 },
                                { band: 3, gain: 0.40 }
                            ]
                        };
                        filterName = 'Bass Boost';
                        break;
                    case 'filter_nightcore':
                        filterData = {
                            timescale: { speed: 1.2, pitch: 1.3, rate: 1.0 }
                        };
                        filterName = 'Nightcore';
                        break;
                    case 'filter_vaporwave':
                        filterData = {
                            timescale: { speed: 0.8, pitch: 0.8, rate: 1.0 }
                        };
                        filterName = 'Vaporwave';
                        break;
                    case 'filter_3d':
                        filterData = { rotation: { rotationHz: 0.2 } };
                        filterName = '3D / Rotation';
                        break;
                    case 'filter_karaoke':
                        filterData = {
                            karaoke: { level: 1.0, monoLevel: 1.0, filterBand: 220.0, filterWidth: 100.0 }
                        };
                        filterName = 'Karaoke';
                        break;
                    case 'filter_tremolo':
                        filterData = {
                            tremolo: { frequency: 4.0, depth: 0.75 }
                        };
                        filterName = 'Tremolo';
                        break;
                    case 'filter_vibrato':
                        filterData = {
                            vibrato: { frequency: 4.0, depth: 0.3 }
                        };
                        filterName = 'Vibrato';
                        break;
                    case 'filter_distortion':
                        filterData = {
                            distortion: {
                                sinOffset: 0.0, sinScale: 1.0,
                                cosOffset: 0.0, cosScale: 1.0,
                                tanOffset: 0.0, tanScale: 1.0,
                                offset: 0.0, scale: 1.5
                            }
                        };
                        filterName = 'Distortion';
                        break;
                    case 'filter_lowpass':
                        filterData = {
                            lowPass: { smoothing: 20.0 }
                        };
                        filterName = 'Low Pass Filter';
                        break;
                    case 'filter_channelmix':
                        filterData = {
                            channelMix: { leftToLeft: 0.5, leftToRight: 0.5, rightToLeft: 0.5, rightToRight: 0.5 }
                        };
                        filterName = 'Channel Mix';
                        break;
                }

                player.shoukaku.setFilters(filterData);

                const { MusicUtils } = await import('#utils/MusicUtils');
                const updatedPanel = MusicUtils.getPlayerPanel(client, player, player.queue.current);

                await interaction.update(updatedPanel);
                await interaction.followUp({
                    components: KyraUI.buildSimpleMessage(`${client.config.emojis.success} Applied filter: **${filterName}**`),
                    flags: KyraUI.getFlags(true)
                });
            }
        }
        // --- Ticket Creation & Actions ---
        if (interaction.isButton() && interaction.customId.startsWith('ticket_action_')) {
            const { handleTicketAction } = await import('../commands/admin/ticket.js');
            return handleTicketAction(client, interaction);
        }
        if (interaction.isStringSelectMenu() && interaction.customId.startsWith('ticket_select_')) {
            const { handleTicketAction } = await import('../commands/admin/ticket.js');
            return handleTicketAction(client, interaction);
        }
        if (interaction.isModalSubmit() && interaction.customId.startsWith('ticket_modal_')) {
            const { handleTicketModal } = await import('../commands/admin/ticket.js');
            return handleTicketModal(client, interaction);
        }
        if (interaction.customId.startsWith('ticket_config_')) {
            const { handleTicketConfig } = await import('../commands/admin/ticket.js');
            return handleTicketConfig(client, interaction);
        }
    }
};
