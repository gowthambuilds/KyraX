import { PermissionFlagsBits } from 'discord.js';
import { Guild } from '#src/database/index.js';
import { KyraUI } from '#classes/KyraUI';
import { Pagination } from '#src/utils/Pagination.js';

export default {
    name: 'quickgreet',
    aliases: ['qgreet'],
    description: 'Manage the quick greet system (ping delete)',
    slash: true,
    permissions: [PermissionFlagsBits.Administrator],
    options: [
        {
            name: 'add',
            description: 'Add a channel to quick greet',
            type: 1,
            options: [
                {
                    name: 'channel',
                    description: 'The channel to add',
                    type: 7,
                    required: true
                }
            ]
        },
        {
            name: 'remove',
            description: 'Remove a channel from quick greet',
            type: 1,
            options: [
                {
                    name: 'channel',
                    description: 'The channel to remove',
                    type: 7,
                    required: true
                }
            ]
        },
        {
            name: 'list',
            description: 'List configured quick greet channels',
            type: 1
        },
        {
            name: 'reset',
            description: 'Remove all quick greet channels',
            type: 1
        },
        {
            name: 'test',
            description: 'Test the quick greet',
            type: 1
        }
    ],
    async execute({ client, interaction, message, args }) {
        const isSlash = !!interaction;
        const sub = isSlash ? interaction.options.getSubcommand() : args[0]?.toLowerCase();
        const guildId = interaction?.guildId || message?.guild?.id;

        const guildData = await Guild.findOneAndUpdate(
            { _id: guildId },
            { $setOnInsert: { prefix: client.config.bot.prefix } },
            { upsert: true, new: true }
        );

        if (!sub) {
            const dashboard = KyraUI.buildDetailedDashboard(
                '⚡ Quick Greet Commands',
                'Manage the ping-and-delete welcome system.',
                [
                    { name: 'add <#channel>', value: 'Add a channel to the list.' },
                    { name: 'remove <#channel>', value: 'Remove a channel from the list.' },
                    { name: 'list', value: 'List all configured channels.' },
                    { name: 'reset', value: 'Remove all channels.' },
                    { name: 'test', value: 'Simulate the quick greet.' }
                ]
            );
            return isSlash ? interaction.reply({ components: dashboard, flags: KyraUI.getFlags() }) : message.reply({ components: dashboard, flags: KyraUI.getFlags() });
        }

        switch (sub) {
            case 'add': {
                const channel = isSlash ? interaction.options.getChannel('channel') : message.mentions.channels.first();
                if (!channel) return KyraUI.sendUsage({ client, message, interaction }, 'quickgreet add <#channel>');

                if (guildData.quickGreet.channels.includes(channel.id)) {
                    const err = KyraUI.buildSimpleMessage(`${client.config.emojis.error} That channel is already in the list.`);
                    return isSlash ? interaction.reply({ components: err, flags: KyraUI.getFlags(true) }) : message.reply({ components: err, flags: KyraUI.getFlags(true) });
                }

                guildData.quickGreet.channels.push(channel.id);
                await guildData.save();

                const success = KyraUI.buildSimpleMessage(`${client.config.emojis.success} Added <#${channel.id}> to Quick Greet.`);
                return isSlash ? interaction.reply({ components: success, flags: KyraUI.getFlags() }) : message.reply({ components: success, flags: KyraUI.getFlags() });
            }

            case 'remove': {
                const channel = isSlash ? interaction.options.getChannel('channel') : message.mentions.channels.first();
                if (!channel) return KyraUI.sendUsage({ client, message, interaction }, 'quickgreet remove <#channel>');

                if (!guildData.quickGreet.channels.includes(channel.id)) {
                    const err = KyraUI.buildSimpleMessage(`${client.config.emojis.error} That channel is not in the list.`);
                    return isSlash ? interaction.reply({ components: err, flags: KyraUI.getFlags(true) }) : message.reply({ components: err, flags: KyraUI.getFlags(true) });
                }

                guildData.quickGreet.channels = guildData.quickGreet.channels.filter(id => id !== channel.id);
                await guildData.save();

                const success = KyraUI.buildSimpleMessage(`${client.config.emojis.success} Removed <#${channel.id}> from Quick Greet.`);
                return isSlash ? interaction.reply({ components: success, flags: KyraUI.getFlags() }) : message.reply({ components: success, flags: KyraUI.getFlags() });
            }

            case 'list': {
                const channels = guildData.quickGreet.channels.map(id => `- <#${id}> (\`${id}\`)`);
                const title = `⚡ Quick Greet Channels (${channels.length})`;

                if (channels.length === 0) {
                    const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} No channels configured.`);
                    return isSlash ? interaction.reply({ components: msg, flags: KyraUI.getFlags(true) }) : message.reply({ components: msg, flags: KyraUI.getFlags(true) });
                }

                return Pagination.create({
                    client,
                    interaction,
                    message,
                    title,
                    items: channels,
                    itemsPerPage: 10
                });
            }

            case 'reset': {
                guildData.quickGreet.channels = [];
                await guildData.save();

                const success = KyraUI.buildSimpleMessage(`${client.config.emojis.success} Reset all Quick Greet channels.`);
                return isSlash ? interaction.reply({ components: success, flags: KyraUI.getFlags() }) : message.reply({ components: success, flags: KyraUI.getFlags() });
            }

            case 'test': {
                if (guildData.quickGreet.channels.length === 0) {
                    const err = KyraUI.buildSimpleMessage(`${client.config.emojis.error} No channels configured.`);
                    return isSlash ? interaction.reply({ components: err, flags: KyraUI.getFlags(true) }) : message.reply({ components: err, flags: KyraUI.getFlags(true) });
                }

                let sentCount = 0;
                const guild = interaction?.guild || message?.guild;
                const user = interaction?.user || message?.author;

                for (const updatedChannelId of guildData.quickGreet.channels) {
                    const ch = guild.channels.cache.get(updatedChannelId);
                    if (ch) {
                        ch.send({ content: `<@${user.id}>` }).then(msg => {
                            setTimeout(() => msg.delete().catch(() => { }), 5000);
                        }).catch(() => { });
                        sentCount++;
                    }
                }

                const success = KyraUI.buildSimpleMessage(`${client.config.emojis.success} Simulated Quick Greet in ${sentCount} channels.`);
                return isSlash ? interaction.reply({ components: success, flags: KyraUI.getFlags(true) }) : message.reply({ components: success, flags: KyraUI.getFlags(true) });
            }

            default:
                return KyraUI.sendUsage({ client, message, interaction }, 'quickgreet <add|remove|list|reset|test>');
        }
    }
};
