import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } from 'discord.js';
import { logger } from './logger.js';
import { Giveaway, GiveawayEntry } from '#src/database/index.js';

export class GiveawayManager {
    constructor(client) {
        this.client = client;
        this.timers = new Map();
    }

    /**
     * Resumes all active giveaways from the database.
     */
    async init() {
        // Start periodic ticker (every 60 seconds)
        // This acts as a fail-safe for setTimeout and handles bot restarts/offline time
        this.ticker = setInterval(() => this.checkGiveaways(), 60 * 1000);

        await this.checkGiveaways();
        logger.success('GIVEAWAY', 'Giveaway manager initialized with fail-safe ticker.');
    }

    /**
     * Periodic check for giveaways that should end.
     */
    async checkGiveaways() {
        try {
            const activeGiveaways = await Giveaway.find({ ended: false, paused: false });
            const now = Date.now();

            for (const data of activeGiveaways) {
                const endTimestamp = new Date(data.endTimestamp).getTime();
                const remaining = endTimestamp - now;

                if (remaining <= 0) {
                    // Giveaway should have ended already
                    await this.end(data._id);
                } else if (remaining <= 60000 && !this.timers.has(data._id)) {
                    // Giveaway ends within the next minute, set a precise timer if not already set
                    const timeout = setTimeout(() => this.end(data._id), remaining);
                    this.timers.set(data._id, timeout);
                }
                // For long running giveaways (> 1 min), we rely on the ticker
                // this avoids 32-bit integer overflow for very long durations (e.g. 25+ days)
            }
        } catch (error) {
            logger.error('GIVEAWAY', 'Error in giveaway ticker:', error);
        }
    }

    /**
     * Creates a new giveaway.
     */
    async create({ channel, prize, winners, duration, host }) {
        const endTime = Date.now() + duration;

        const container = this._buildGiveawayContainer(prize, winners, endTime, host, 0);
        const message = await channel.send({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });

        await Giveaway.create({
            _id: message.id,
            channelId: channel.id,
            guildId: channel.guild.id,
            hostId: host.id,
            prize,
            winnerCount: winners,
            endTimestamp: new Date(endTime),
            startTimestamp: new Date(),
            ended: false,
            paused: false
        });

        const timeoutDelay = Math.min(duration, 60000); // Max 1 minute for setTimeout, then rely on ticker
        if (duration <= 60000) {
            const timeout = setTimeout(() => this.end(message.id), duration);
            this.timers.set(message.id, timeout);
        }

        return message;
    }

    /**
     * Pauses a giveaway.
     */
    async pause(messageId) {
        const data = await Giveaway.findById(messageId);
        if (!data || data.ended || data.paused) return false;

        // Calculate usage of pauseTime if needed for logic, but simply marking paused is often enough if we adjust endTimestamp on resume
        // For simplicity using a temp field or just handling logic on resume
        await Giveaway.updateOne({ _id: messageId }, { paused: true, pauseStartTime: Date.now() });

        // Clear existing timer
        const timeout = this.timers.get(messageId);
        if (timeout) {
            clearTimeout(timeout);
            this.timers.delete(messageId);
        }

        try {
            const channel = await this.client.channels.fetch(data.channelId);
            const message = await channel.messages.fetch(messageId);
            const host = await this.client.users.fetch(data.hostId);
            const entryCount = await GiveawayEntry.countDocuments({ giveawayId: messageId });

            const container = this._buildPausedContainer(data.prize, data.winnerCount, data.endTimestamp.getTime(), host, entryCount);
            await message.edit({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });

            return true;
        } catch (error) {
            logger.error('GIVEAWAY', `Failed to pause giveaway ${messageId}`, error);
            return false;
        }
    }

    /**
     * Resumes a giveaway.
     */
    async resume(messageId) {
        const data = await Giveaway.findById(messageId);
        if (!data || data.ended || !data.paused) return false;

        // Calculate pause duration and update end time
        const pauseDuration = data.pauseStartTime ? Date.now() - new Date(data.pauseStartTime).getTime() : 0;
        const newEndTimestamp = new Date(new Date(data.endTimestamp).getTime() + pauseDuration);

        await Giveaway.updateOne({ _id: messageId }, {
            paused: false,
            pauseStartTime: null,
            endTimestamp: newEndTimestamp
        });

        const remaining = newEndTimestamp.getTime() - Date.now();

        if (remaining > 0) {
            if (remaining <= 60000) {
                const timeout = setTimeout(() => this.end(messageId), remaining);
                this.timers.set(messageId, timeout);
            }
        } else {
            await this.end(messageId);
        }

        try {
            const channel = await this.client.channels.fetch(data.channelId);
            const message = await channel.messages.fetch(messageId);
            const host = await this.client.users.fetch(data.hostId);
            const entryCount = await GiveawayEntry.countDocuments({ giveawayId: messageId });

            const container = this._buildGiveawayContainer(data.prize, data.winnerCount, newEndTimestamp.getTime(), host, entryCount);
            await message.edit({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
            return true;
        } catch (error) {
            logger.error('GIVEAWAY', `Failed to resume giveaway ${messageId}`, error);
            return false;
        }
    }

    /**
     * Ends a giveaway and picks winners.
     */
    async end(messageId) {
        const data = await Giveaway.findById(messageId);
        if (!data || data.ended) return;

        await Giveaway.updateOne({ _id: messageId }, { ended: true });

        // Clear timeout if it exists
        const timeout = this.timers.get(messageId);
        if (timeout) {
            clearTimeout(timeout);
            this.timers.delete(messageId);
        }

        try {
            const channel = await this.client.channels.fetch(data.channelId);
            const message = await channel.messages.fetch(messageId);

            // Fetch all entries
            const entries = await GiveawayEntry.find({ giveawayId: messageId }).select('userId');
            const participantIds = entries.map(e => e.userId);

            const winners = this._pickWinners(participantIds, data.winnerCount);
            const winnersMentions = winners.map(w => `<@${w}>`);

            const container = this._buildEndedContainer(data.prize, data.winnerCount, winnersMentions, data.hostId, participantIds.length);
            await message.edit({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });

            if (winners.length > 0) {
                await message.reply({
                    content: `${this.client.config.emojis.giveaway} Congratulations ${winnersMentions.join(', ')}! You won **${data.prize}**!`
                });

                // Send DMs to winners
                for (const winnerId of winners) {
                    try {
                        const user = await this.client.users.fetch(winnerId);
                        await user.send({
                            content: `### ${this.client.config.emojis.giveaway} **Giveaway Won!**\n\n` +
                                `Congratulations! You have won the giveaway for **${data.prize}**!\n\n` +
                                `**Server:** ${channel.guild.name}\n` +
                                `**Channel:** <#${channel.id}>\n` +
                                `**Message:** [Jump to Message](${message.url})`
                        });
                    } catch (err) {
                        logger.error('GIVEAWAY', `Failed to send DM to winner ${winnerId}`, err);
                    }
                }
            } else {
                await message.reply({
                    content: `${this.client.config.emojis.error} No valid entries for the giveaway for **${data.prize}**.`
                });
            }
        } catch (error) {
            logger.error('GIVEAWAY', `Failed to end giveaway ${messageId}`, error);
        }
    }

    /**
     * Rerolls a giveaway.
     */
    async reroll(messageId) {
        const data = await Giveaway.findById(messageId);
        if (!data || !data.ended) return null;

        const entries = await GiveawayEntry.find({ giveawayId: messageId }).select('userId');
        const participantIds = entries.map(e => e.userId);

        const winners = this._pickWinners(participantIds, data.winnerCount);
        const winnersMentions = winners.map(w => `<@${w}>`);

        try {
            const channel = await this.client.channels.fetch(data.channelId);
            const message = await channel.messages.fetch(messageId);

            if (winners.length > 0) {
                // Update the original giveaway message with new winners
                const container = this._buildEndedContainer(data.prize, data.winnerCount, winnersMentions, data.hostId, participantIds.length);
                await message.edit({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                });

                await channel.send({
                    content: `${this.client.config.emojis.giveaway} **Reroll:** Congratulations ${winnersMentions.join(', ')}! You are the new winner(s) of **${data.prize}**!`
                });

                // Send DMs to reroll winners
                for (const winnerId of winners) {
                    try {
                        const user = await this.client.users.fetch(winnerId);
                        await user.send({
                            content: `### ${this.client.config.emojis.giveaway} **Giveaway Reroll Won!**\n\n` +
                                `Congratulations! You are the new winner of the giveaway for **${data.prize}**!\n\n` +
                                `**Server:** ${channel.guild.name}\n` +
                                `**Channel:** <#${channel.id}>\n` +
                                `**Message:** [Jump to Message](${message.url})`
                        });
                    } catch (err) {
                        logger.error('GIVEAWAY', `Failed to send DM to reroll winner ${winnerId}`, err);
                    }
                }
            }
            return winners;
        } catch (error) {
            logger.error('GIVEAWAY', `Failed to reroll giveaway ${messageId}`, error);
            return null;
        }
    }

    /**
     * Handles a user entering/leaving a giveaway.
     */
    async handleEntry(interaction) {
        const messageId = interaction.message.id;
        const data = await Giveaway.findById(messageId);

        if (!data || data.ended) {
            return interaction.reply({
                content: `${this.client.config.emojis.error} This giveaway has already ended!`,
                flags: MessageFlags.Ephemeral
            });
        }

        if (data.paused) {
            return interaction.reply({
                content: `${this.client.config.emojis.error} This giveaway is currently paused!`,
                flags: MessageFlags.Ephemeral
            });
        }

        const userId = interaction.user.id;
        const existingEntry = await GiveawayEntry.findOne({ giveawayId: messageId, userId });

        if (existingEntry) {
            await GiveawayEntry.deleteOne({ _id: existingEntry._id });
            await interaction.reply({
                content: `${this.client.config.emojis.error} You have left the giveaway.`,
                flags: MessageFlags.Ephemeral
            });
        } else {
            await GiveawayEntry.create({ giveawayId: messageId, userId });
            await interaction.reply({
                content: `${this.client.config.emojis.success} You have entered the giveaway for **${data.prize}**!`,
                flags: MessageFlags.Ephemeral
            });
        }

        // Update the giveaway message
        const entryCount = await GiveawayEntry.countDocuments({ giveawayId: messageId });
        const host = await this.client.users.fetch(data.hostId);

        const container = this._buildGiveawayContainer(data.prize, data.winnerCount, data.endTimestamp.getTime(), host, entryCount);
        await interaction.message.edit({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }

    _pickWinners(participants, count) {
        if (!participants.length) return [];
        const shuffled = [...participants];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled.slice(0, Math.min(count, participants.length));
    }

    _buildGiveawayContainer(prize, winners, endTime, host, participantCount) {
        const container = new ContainerBuilder();

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`### ${this.client.config.emojis.giveaway} **ACTIVE GIVEAWAY**\n# **${prize}**`)
        );

        container.addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );

        const content =
            `**Giveaway Information**\n` +
            `${this.client.config.emojis.dot} **Winners:** \`${winners}\`\n` +
            `${this.client.config.emojis.dot} **Ending In:** <t:${Math.floor(endTime / 1000)}:R>\n` +
            `${this.client.config.emojis.dot} **Hosted by:** <@${host.id}>\n\n` +
            `**Live Statistics**\n` +
            `${this.client.config.emojis.dot} **Entries:** \`${participantCount}\`\n\n` +
            `*Join the giveaway by clicking the button below!*`;

        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));

        container.addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('giveaway_enter')
                    .setLabel(`Participate (${participantCount})`)
                    .setStyle(ButtonStyle.Success)
                    .setEmoji(this.client.config.emojis.giveaway),
                new ButtonBuilder()
                    .setCustomId('giveaway_participants')
                    .setLabel('Participants')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('👥')
            )
        );

        return container;
    }

    _buildPausedContainer(prize, winners, endTime, host, participantCount) {
        const container = new ContainerBuilder();

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`### ⏸️ **GIVEAWAY PAUSED**\n# **${prize}**`)
        );

        container.addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );

        const content =
            `**Giveaway Status**\n` +
            `${this.client.config.emojis.dot} **Winners:** \`${winners}\`\n` +
            `${this.client.config.emojis.dot} **Status:** \`TEMPORARILY PAUSED\`\n` +
            `${this.client.config.emojis.dot} **Hosted by:** <@${host.id}>\n\n` +
            `**Total Entries:** \`${participantCount}\`\n\n` +
            `*This competition is currently on hold.*`;

        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));

        container.addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('giveaway_paused')
                    .setLabel('Paused')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('giveaway_participants')
                    .setLabel('Participants')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('👥')
            )
        );

        return container;
    }

    _buildEndedContainer(prize, winnersCount, winners, hostId, participantCount) {
        const container = new ContainerBuilder();

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`### ${this.client.config.emojis.giveaway} **GIVEAWAY CONCLUDED**\n# **${prize}**`)
        );

        container.addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );

        const winnersText = winners.length > 0 ? winners.join(', ') : 'No valid participants joined.';
        const content =
            `**Overview**\n` +
            `${this.client.config.emojis.dot} **Awarding:** \`${winnersCount} Winner(s)\`\n` +
            `${this.client.config.emojis.dot} **Host:** <@${hostId}>\n` +
            `${this.client.config.emojis.dot} **Total Entries:** \`${participantCount}\`\n\n` +
            `### 🏆 **Winner List**\n` +
            `${winnersText}\n\n` +
            `*This event has officially ended.*`;

        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));

        container.addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('giveaway_ended')
                    .setLabel('Concluded')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('giveaway_participants')
                    .setLabel('Participants')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('👥')
            )
        );

        return container;
    }
}
