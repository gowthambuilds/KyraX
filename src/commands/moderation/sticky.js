import { KyraUI } from '#classes/KyraUI';
import { PermissionFlagsBits } from 'discord.js';
import { Guild } from '#src/database/index.js';

export default {
    name: 'sticky',
    description: 'Manage sticky messages in channels',
    aliases: ['stick'],
    slash: false,
    options: [
        {
            name: 'add',
            description: 'Add a sticky message to a channel',
            type: 1,
            options: [
                { name: 'message', description: 'The message to stick', type: 3, required: true },
                { name: 'channel', description: 'The channel to stick the message in', type: 7, required: false }
            ]
        },
        {
            name: 'remove',
            description: 'Remove a sticky message from a channel',
            type: 1,
            options: [
                { name: 'channel', description: 'The channel to remove sticky from', type: 7, required: false }
            ]
        },
        {
            name: 'list',
            description: 'List all sticky messages in the server',
            type: 1
        },
        {
            name: 'reset',
            description: 'Reset all sticky messages in the server',
            type: 1
        }
    ],
    async execute({ client, message, interaction, args }) {
        const isSlash = !!interaction; // Re-enable slash support logic if enabled in future, or just respect current state
        if (isSlash) await interaction.deferReply({ flags: KyraUI.getFlags() });

        const guild = isSlash ? interaction.guild : message.guild;
        const executor = isSlash ? interaction.member : message.member;

        // Permission Checks
        if (!executor.permissions.has(PermissionFlagsBits.ManageMessages)) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You need **Manage Messages** permissions.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        const subcommand = isSlash ? interaction.options.getSubcommand() : args[0]?.toLowerCase();

        if (subcommand === 'add') {
            let stickyMsg = isSlash ? interaction.options.getString('message') : args.slice(1).join(' ');
            const targetChannel = isSlash ? (interaction.options.getChannel('channel') || interaction.channel) : (message.mentions.channels.first() || message.channel);

            if (!isSlash && message.mentions.channels.first()) {
                stickyMsg = stickyMsg.replace(new RegExp(`<#${targetChannel.id}>`, 'g'), '').trim();
            }

            if (!stickyMsg) {
                return KyraUI.sendUsage({ client, message, interaction }, isSlash ? '/sticky add message: <message> [channel: channel]' : `${client.prefix}sticky add <message> [channel]`);
            }

            // Update database using Map methods for Mongoose compatibility
            const guildSettings = await Guild.findById(guild.id);
            if (!guildSettings) {
                await Guild.create({ _id: guild.id, stickyData: new Map([[targetChannel.id, { content: stickyMsg, lastMessageId: null }]]) });
            } else {
                guildSettings.stickyData.set(targetChannel.id, { content: stickyMsg, lastMessageId: null });
                await guildSettings.save();
            }

            const successContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.success} Sticky message added to <#${targetChannel.id}>.`);
            return isSlash ? interaction.editReply({ components: successContainer }) : message.reply({ components: successContainer, flags: KyraUI.getFlags() });

        } else if (subcommand === 'remove') {
            const targetChannel = isSlash ? (interaction.options.getChannel('channel') || interaction.channel) : (message.mentions.channels.first() || message.channel);

            const guildSettings = await Guild.findById(guild.id);
            if (!guildSettings || !guildSettings.stickyData.has(targetChannel.id)) {
                const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} No sticky message found in <#${targetChannel.id}>.`);
                return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
            }

            // Delete the last sticky message if it exists
            const sticky = guildSettings.stickyData.get(targetChannel.id);
            if (sticky.lastMessageId) {
                const channel = await guild.channels.fetch(targetChannel.id).catch(() => null);
                if (channel) {
                    const oldMsg = await channel.messages.fetch(sticky.lastMessageId).catch(() => null);
                    if (oldMsg) await oldMsg.delete().catch(() => { });
                }
            }

            guildSettings.stickyData.delete(targetChannel.id);
            await guildSettings.save();

            const successContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.success} Sticky message removed from <#${targetChannel.id}>.`);
            return isSlash ? interaction.editReply({ components: successContainer }) : message.reply({ components: successContainer, flags: KyraUI.getFlags() });

        } else if (subcommand === 'list') {
            const guildSettings = await Guild.findById(guild.id);
            if (!guildSettings || !guildSettings.stickyData || guildSettings.stickyData.size === 0) {
                const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} No sticky messages configured in this server.`);
                return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
            }

            const fields = [];
            for (const [channelId, data] of guildSettings.stickyData) {
                fields.push({
                    name: `Channel: <#${channelId}>`,
                    value: `Message: ${data.content.length > 50 ? data.content.substring(0, 47) + '...' : data.content}`
                });
            }

            const listContainer = KyraUI.buildDetailedDashboard(
                `${client.config.emojis.dot} **Sticky Messages**`,
                `Total active sticky messages: **${guildSettings.stickyData.size}**`,
                fields
            );

            return isSlash ? interaction.editReply({ components: listContainer }) : message.reply({ components: listContainer, flags: KyraUI.getFlags() });

        } else if (subcommand === 'reset') {
            const guildSettings = await Guild.findById(guild.id);
            if (!guildSettings || !guildSettings.stickyData || guildSettings.stickyData.size === 0) {
                const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} No sticky messages to reset.`);
                return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
            }

            guildSettings.stickyData.clear();
            await guildSettings.save();

            const successContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.success} All sticky messages have been reset.`);
            return isSlash ? interaction.editReply({ components: successContainer }) : message.reply({ components: successContainer, flags: KyraUI.getFlags() });

        } else {
            return KyraUI.sendUsage({ client, message, interaction }, isSlash ? '/sticky <add|remove|list|reset>' : `${client.prefix}sticky <add|remove|list|reset>`);
        }
    }
};

