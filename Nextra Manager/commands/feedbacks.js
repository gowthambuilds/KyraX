import { ApplicationCommandOptionType, PermissionFlagsBits, ChannelType } from 'discord.js';
import { TicketUI } from '#classes/TicketUI';

export default {
    name: 'feedbacks',
    aliases: ['fb'],
    description: 'Manage and view staff feedbacks',

    options: [
        {
            name: 'channel',
            description: 'Set the feedback tracking channel',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'channel',
                    description: 'The channel to track feedbacks in',
                    type: ApplicationCommandOptionType.Channel,
                    channelTypes: [ChannelType.GuildText],
                    required: true
                }
            ]
        },
        {
            name: 'user',
            description: 'Check feedbacks for a specific staff member',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'target',
                    description: 'The staff member to check',
                    type: ApplicationCommandOptionType.User,
                    required: true
                }
            ]
        },
        {
            name: 'stats',
            description: 'View the staff feedback leaderboard',
            type: ApplicationCommandOptionType.Subcommand
        }
    ],
    async execute({ client, message, interaction, args }) {
        const isSlash = !!interaction;
        const guild = isSlash ? interaction.guild : message.guild;
        const member = isSlash ? interaction.member : message.member;

        let subcommand;

        if (isSlash) {
            subcommand = interaction.options.getSubcommand();
        } else {
            if (!args || args.length === 0) return message.reply('Usage: `feedbacks <channel|user|stats>`');
            subcommand = args[0].toLowerCase();
        }

        // Handle 'channel' subcommand
        if (subcommand === 'channel') {
            if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                const msg = 'You need Manage Server permissions to use this command.';
                return isSlash ? interaction.reply({ components: TicketUI.buildSimpleMessage(msg), flags: TicketUI.getFlags(true) }) : message.reply(msg);
            }

            let channel;
            if (isSlash) {
                channel = interaction.options.getChannel('channel');
            } else {
                channel = message.mentions.channels.first() || guild.channels.cache.get(args[1]);
            }

            if (!channel) {
                const msg = 'Please provide a valid channel.';
                return isSlash ? interaction.reply({ components: TicketUI.buildSimpleMessage(msg), flags: TicketUI.getFlags(true) }) : message.reply(msg);
            }

            const settings = await client.db.getSettings(guild.id);
            settings.feedbackChannelId = channel.id;
            await client.db.saveSettings(guild.id, settings);

            const msg = `Feedback channel set to <#${channel.id}> ${client.config.emojis.check}`;
            if (isSlash) await interaction.reply({ components: TicketUI.buildSimpleMessage(msg), flags: TicketUI.getFlags() });
            else await message.reply({ components: TicketUI.buildSimpleMessage(msg), flags: TicketUI.getFlags() });
            return;
        }

        // Handle 'user' subcommand
        if (subcommand === 'user' || (isSlash && subcommand === 'user')) {
            let targetUser;
            if (isSlash) {
                targetUser = interaction.options.getUser('target');
            } else {
                targetUser = message.mentions.users.first() || await client.users.fetch(args[1]).catch(() => null);
            }

            if (!targetUser) {
                const msg = 'Please provide a valid user.';
                return isSlash ? interaction.reply({ components: TicketUI.buildSimpleMessage(msg), flags: TicketUI.getFlags(true) }) : message.reply(msg);
            }

            const settings = await client.db.getSettings(guild.id);
            const feedbacks = settings.feedbacks || {};
            const count = feedbacks[targetUser.id] || 0;

            const msg = `**${targetUser.username}** has **${count}** feedbacks. ${client.config.emojis.dot}`;
            if (isSlash) await interaction.reply({ components: TicketUI.buildSimpleMessage(msg), flags: TicketUI.getFlags() });
            else await message.reply({ components: TicketUI.buildSimpleMessage(msg), flags: TicketUI.getFlags() });
            return;
        }

        // Handle 'stats' subcommand
        if (subcommand === 'stats') {
            const settings = await client.db.getSettings(guild.id);
            const feedbacks = settings.feedbacks || {};

            if (Object.keys(feedbacks).length === 0) {
                const msg = 'No feedbacks recorded yet.';
                return isSlash ? interaction.reply({ components: TicketUI.buildSimpleMessage(msg), flags: TicketUI.getFlags() }) : message.reply(msg);
            }

            const leaderboard = Object.entries(feedbacks)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([userId, count], index) => {
                    const place = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
                    return `${place} <@${userId}>: **${count}** feedbacks`;
                })
                .join('\n');

            const msg = `## 🏆 Staff Feedback Leaderboard\n\n${leaderboard}`;
            if (isSlash) await interaction.reply({ components: TicketUI.buildSimpleMessage(msg), flags: TicketUI.getFlags() });
            else await message.reply({ components: TicketUI.buildSimpleMessage(msg), flags: TicketUI.getFlags() });
            return;
        }
    }
};
