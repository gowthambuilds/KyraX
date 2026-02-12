import { ApplicationCommandOptionType, PermissionFlagsBits, ChannelType } from 'discord.js';
import { TicketUI } from '#classes/TicketUI';

export default {
    name: 'greet',
    description: 'Manage the welcome system',
    options: [
        {
            name: 'test',
            description: 'Test the greet system',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'user',
                    description: 'The user to greet (defaults to you)',
                    type: ApplicationCommandOptionType.User,
                    required: false
                }
            ]
        },
        {
            name: 'channel',
            description: 'Set the welcome channel',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'channel',
                    description: 'The channel to send welcome messages in',
                    type: ApplicationCommandOptionType.Channel,
                    channelTypes: [ChannelType.GuildText],
                    required: true
                }
            ]
        },
        {
            name: 'toggle',
            description: 'Enable or disable the welcome system',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'status',
                    description: 'Turn welcome messages on or off',
                    type: ApplicationCommandOptionType.Boolean,
                    required: true
                }
            ]
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
            if (!args || args.length === 0) return message.reply('Usage: `greet <test|channel|toggle>`');
            subcommand = args[0].toLowerCase();
        }

        // Permission Check for config commands
        if (['channel', 'toggle'].includes(subcommand) && !member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            const msg = 'You need Manage Server permissions to use this command.';
            return isSlash ? interaction.reply({
                components: TicketUI.buildSimpleMessage(msg),
                flags: TicketUI.getFlags(true)
            }) : message.reply(msg);
        }

        // Handle 'test' subcommand
        if (subcommand === 'test') {
            let targetUser;
            if (isSlash) {
                targetUser = interaction.options.getUser('user') || interaction.user;
            } else {
                targetUser = message.mentions.users.first() || (args[1] ? await client.users.fetch(args[1]).catch(() => null) : message.author);
            }

            if (!targetUser) {
                const msg = 'Please provide a valid user.';
                return isSlash ? interaction.reply({ components: TicketUI.buildSimpleMessage(msg), flags: TicketUI.getFlags(true) }) : message.reply(msg);
            }


            const components = TicketUI.buildWelcome(targetUser, guild);

            // Fixed: Removed 'content' to comply with V2 flags
            const payload = {
                components: components,
                flags: TicketUI.getFlags()
            };

            if (isSlash) await interaction.reply(payload);
            else await message.reply(payload);
            return;
        }

        const settings = await client.db.getSettings(guild.id);

        // Handle 'channel' subcommand
        if (subcommand === 'channel') {
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

            settings.welcomeChannelId = channel.id;
            await client.db.saveSettings(guild.id, settings);

            const msg = `Welcome channel set to <#${channel.id}> ${client.config.emojis.check}`;
            if (isSlash) await interaction.reply({ components: TicketUI.buildSimpleMessage(msg), flags: TicketUI.getFlags() });
            else await message.reply({ components: TicketUI.buildSimpleMessage(msg), flags: TicketUI.getFlags() });
            return;
        }

        // Handle 'toggle' subcommand
        if (subcommand === 'toggle') {
            let status;
            if (isSlash) {
                status = interaction.options.getBoolean('status');
            } else {
                if (!args[1]) return message.reply('Usage: `greet toggle <on|off>`');
                const input = args[1].toLowerCase();
                if (input === 'on' || input === 'true' || input === 'enable') status = true;
                else if (input === 'off' || input === 'false' || input === 'disable') status = false;
                else return message.reply('Invalid status. Use on/off.');
            }

            settings.welcomeEnabled = status;
            await client.db.saveSettings(guild.id, settings);

            const statusText = status ? 'enabled' : 'disabled';
            const emoji = status ? client.config.emojis.check : client.config.emojis.cross;
            const msg = `Welcome system has been **${statusText}** ${emoji}`;

            if (isSlash) await interaction.reply({ components: TicketUI.buildSimpleMessage(msg), flags: TicketUI.getFlags() });
            else await message.reply({ components: TicketUI.buildSimpleMessage(msg), flags: TicketUI.getFlags() });
            return;
        }
    }
};
