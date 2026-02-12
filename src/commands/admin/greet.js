import { PermissionFlagsBits } from 'discord.js';
import { Guild } from '#src/database/index.js';
import { KyraUI } from '#classes/KyraUI';
import { Pagination } from '#src/utils/Pagination.js';

export default {
    name: 'greet',
    description: 'Manage the welcome system',
    slash: true,
    permissions: [PermissionFlagsBits.Administrator],
    options: [
        {
            name: 'setup',
            description: 'Setup the welcome channel and enable the system',
            type: 1,
            options: [
                {
                    name: 'channel',
                    description: 'The channel to send welcome messages in',
                    type: 7,
                    required: true
                }
            ]
        },
        {
            name: 'toggle',
            description: 'Enable or disable the greet system',
            type: 1,
            options: [
                {
                    name: 'state',
                    description: 'On or Off',
                    type: 5,
                    required: true
                }
            ]
        },
        {
            name: 'test',
            description: 'Test the welcome message',
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

        const guildData = await Guild.findOneAndUpdate(
            { _id: guildId },
            { $setOnInsert: { prefix: client.config.bot.prefix } },
            { upsert: true, new: true }
        );

        if (!sub) {
            const dashboard = KyraUI.buildDetailedDashboard(
                '👋 Greet System Commands',
                'Manage the welcome system for your server.',
                [
                    { name: 'setup <channel>', value: 'Set the welcome channel.' },
                    { name: 'toggle <on|off>', value: 'Enable or disable the system.' },
                    { name: 'test', value: 'Send a test welcome message.' },
                    { name: 'config', value: 'View current configuration.' }
                ]
            );
            return isSlash ? interaction.reply({ components: dashboard, flags: KyraUI.getFlags() }) : message.reply({ components: dashboard, flags: KyraUI.getFlags() });
        }

        switch (sub) {
            case 'setup': {
                const channel = isSlash ? interaction.options.getChannel('channel') : message.mentions.channels.first();
                if (!channel) return KyraUI.sendUsage({ client, message, interaction }, 'greet setup <#channel>');

                guildData.greet.channelId = channel.id;
                guildData.greet.enabled = true;
                await guildData.save();

                const success = KyraUI.buildSimpleMessage(`${client.config.emojis.success} **Welcome System Setup**\n\n${client.config.emojis.dot} Channel: <#${channel.id}>\n${client.config.emojis.dot} Status: **Enabled**`);
                return isSlash ? interaction.reply({ components: success, flags: KyraUI.getFlags() }) : message.reply({ components: success, flags: KyraUI.getFlags() });
            }


            case 'toggle': {
                const state = isSlash ? interaction.options.getBoolean('state') : (args[1] === 'on' || args[1] === 'true');
                guildData.greet.enabled = state;
                await guildData.save();

                const success = KyraUI.buildSimpleMessage(`${client.config.emojis.success} **Welcome System ${state ? 'Enabled' : 'Disabled'}**`);
                return isSlash ? interaction.reply({ components: success, flags: KyraUI.getFlags() }) : message.reply({ components: success, flags: KyraUI.getFlags() });
            }

            case 'test': {
                if (!guildData.greet.channelId) {
                    const err = KyraUI.buildSimpleMessage(`${client.config.emojis.error} No welcome channel configured. Use \`/greet setup\`.`);
                    return isSlash ? interaction.reply({ components: err, flags: KyraUI.getFlags(true) }) : message.reply({ components: err, flags: KyraUI.getFlags(true) });
                }

                const channel = (isSlash ? interaction.guild : message.guild).channels.cache.get(guildData.greet.channelId);
                if (!channel) {
                    const err = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Configured channel not found.`);
                    return isSlash ? interaction.reply({ components: err, flags: KyraUI.getFlags(true) }) : message.reply({ components: err, flags: KyraUI.getFlags(true) });
                }

                const user = isSlash ? interaction.user : message.author;
                const guild = isSlash ? interaction.guild : message.guild;

                // Check if user has custom settings from dashboard (mocking for now, or just use default if simple)
                // For now, if they haven't set advanced via wizard (which we just removed), use fixed default
                const msg = KyraUI.buildFixedWelcome(user, guild);

                try {
                    await channel.send(msg);
                    const success = KyraUI.buildSimpleMessage(`${client.config.emojis.success} Test welcome message sent to <#${channel.id}>`);
                    if (isSlash) return interaction.reply({ components: success, flags: KyraUI.getFlags(true) });
                    return message.reply({ components: success, flags: KyraUI.getFlags(true) });
                } catch (e) {
                    const err = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Failed to send test message. Check permissions.`);
                    if (isSlash) return interaction.reply({ components: err, flags: KyraUI.getFlags(true) });
                    return message.reply({ components: err, flags: KyraUI.getFlags(true) });
                }
            }

            case 'config': {
                const status = guildData.greet.enabled ? 'Enabled' : 'Disabled';
                const channel = guildData.greet.channelId ? `<#${guildData.greet.channelId}>` : 'Not Set';

                const dashboard = KyraUI.buildDetailedDashboard(
                    '👋 Greet Configuration',
                    'Current settings for the welcome system.',
                    [
                        { name: 'Status', value: status },
                        { name: 'Channel', value: channel }
                    ]
                );

                return isSlash ? interaction.reply({ components: dashboard, flags: KyraUI.getFlags(true) }) : message.reply({ components: dashboard, flags: KyraUI.getFlags(true) });
            }

            default:
                return KyraUI.sendUsage({ client, message, interaction }, 'greet <setup|toggle|test|config>');
        }
    }
};
