import { PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { KyraUI } from '#classes/KyraUI';
import { Guild } from '#src/database/index.js';

export default {
    name: 'aichannel',
    description: 'Manage AI-enabled channels and global toggle',
    aliases: ['ai', 'aichat'],
    slash: true,
    userPermissions: [PermissionFlagsBits.ManageGuild],
    options: [
        {
            name: 'add',
            description: 'Add a channel to the AI response list',
            type: 1,
            options: [{ name: 'channel', description: 'The channel to add', type: 7, required: true }]
        },
        {
            name: 'remove',
            description: 'Remove a channel from the AI response list',
            type: 1,
            options: [{ name: 'channel', description: 'The channel to remove', type: 7, required: true }]
        },
        {
            name: 'reset',
            description: 'Clear all AI channels',
            type: 1
        },
        {
            name: 'toggle',
            description: 'Enable or disable AI functionality globally',
            type: 1,
            options: [{
                name: 'status',
                description: 'The status to set',
                type: 3,
                required: true,
                choices: [
                    { name: 'Enable', value: 'enable' },
                    { name: 'Disable', value: 'disable' }
                ]
            }]
        }
    ],
    async execute({ client, message, interaction, args }) {
        const isSlash = !!interaction;
        const executor = isSlash ? interaction.member : message.member;
        const guildId = isSlash ? interaction.guildId : message.guildId;

        // Permission Check: Only Administrator can use this command
        if (!executor.permissions.has(PermissionFlagsBits.Administrator)) {
            const err = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You need **Administrator** permissions to use this command.`);
            return isSlash ? interaction.reply({ components: err, flags: KyraUI.getFlags(true) }) : message.reply({ components: err, flags: KyraUI.getFlags() }).catch(() => { });
        }

        let guildData = await Guild.findById(guildId);
        if (!guildData) {
            guildData = await Guild.create({ _id: guildId });
        }

        const settings = {
            aiChannelIds: guildData.ai.channels,
            aiDisabled: !guildData.ai.enabled,
            prefix: guildData.prefix || client.config.bot.prefix
        };

        const subCommand = isSlash ? interaction.options.getSubcommand() : args?.[0]?.toLowerCase();

        if (subCommand === 'add') {
            const channel = isSlash ? interaction.options.getChannel('channel') : message.mentions.channels.first();
            if (!channel) {
                const err = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Please mention a valid channel.`);
                return isSlash ? interaction.reply({ components: err, flags: KyraUI.getFlags(true) }) : message.reply({ components: err, flags: KyraUI.getFlags() }).catch(() => { });
            }

            if (settings.aiChannelIds.includes(channel.id)) {
                const err = KyraUI.buildSimpleMessage(`${client.config.emojis.error} <#${channel.id}> is already an AI channel.`);
                return isSlash ? interaction.reply({ components: err, flags: KyraUI.getFlags(true) }) : message.reply({ components: err, flags: KyraUI.getFlags() }).catch(() => { });
            }

            await Guild.updateOne(
                { _id: guildId },
                { $addToSet: { 'ai.channels': channel.id } }
            );

            const success = KyraUI.buildSimpleMessage(`${client.config.emojis.success} Added <#${channel.id}> to AI channels.`);
            return isSlash ? interaction.reply({ components: success, flags: KyraUI.getFlags(true) }) : message.reply({ components: success, flags: KyraUI.getFlags() }).catch(() => { });

        } else if (subCommand === 'remove') {
            const channel = isSlash ? interaction.options.getChannel('channel') : message.mentions.channels.first();
            if (!channel) {
                const err = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Please mention a valid channel.`);
                return isSlash ? interaction.reply({ components: err, flags: KyraUI.getFlags(true) }) : message.reply({ components: err, flags: KyraUI.getFlags() }).catch(() => { });
            }

            if (!settings.aiChannelIds.includes(channel.id)) {
                const err = KyraUI.buildSimpleMessage(`${client.config.emojis.error} <#${channel.id}> is not an AI channel.`);
                return isSlash ? interaction.reply({ components: err, flags: KyraUI.getFlags(true) }) : message.reply({ components: err, flags: KyraUI.getFlags() }).catch(() => { });
            }

            await Guild.updateOne(
                { _id: guildId },
                { $pull: { 'ai.channels': channel.id } }
            );

            const success = KyraUI.buildSimpleMessage(`${client.config.emojis.success} Removed <#${channel.id}> from AI channels.`);
            return isSlash ? interaction.reply({ components: success, flags: KyraUI.getFlags(true) }) : message.reply({ components: success, flags: KyraUI.getFlags() }).catch(() => { });

        } else if (subCommand === 'reset') {
            await Guild.updateOne(
                { _id: guildId },
                { $set: { 'ai.channels': [] } }
            );
            const success = KyraUI.buildSimpleMessage(`${client.config.emojis.success} All AI channels have been cleared.`);
            return isSlash ? interaction.reply({ components: success, flags: KyraUI.getFlags(true) }) : message.reply({ components: success, flags: KyraUI.getFlags() }).catch(() => { });

        } else if (subCommand === 'enable' || subCommand === 'disable' || (subCommand === 'toggle')) {
            const status = subCommand === 'toggle' ? interaction.options.getString('status') : subCommand;
            const disabled = status === 'disable'; // If disable, means enabled = false
            await Guild.updateOne(
                { _id: guildId },
                { $set: { 'ai.enabled': !disabled } }
            );
            settings.aiDisabled = disabled; // For message below

            const msg = settings.aiDisabled ? 'disabled' : 'enabled';
            const emoji = settings.aiDisabled ? client.config.emojis.error : client.config.emojis.success;
            const success = KyraUI.buildSimpleMessage(`${emoji} AI Chat functionality is now **${msg}**.`);
            return isSlash ? interaction.reply({ components: success, flags: KyraUI.getFlags(true) }) : message.reply({ components: success, flags: KyraUI.getFlags() }).catch(() => { });

        } else {
            // Show Status
            const channels = settings.aiChannelIds.length > 0 ? settings.aiChannelIds.map(id => `<#${id}>`).join(', ') : '`None`';
            const statusEmoji = settings.aiDisabled ? '🔴 Disabled' : '🟢 Enabled';

            const dashboard = KyraUI.buildDashboard(
                `### 🤖 **AI Channel Configuration**`,
                `**Status:** ${statusEmoji}\n` +
                `**Channels:** ${channels}\n\n` +
                `**Prefix Commands:**\n` +
                `\`${settings.prefix}aichannel add #channel\`\n` +
                `\`${settings.prefix}aichannel remove #channel\`\n` +
                `\`${settings.prefix}aichannel reset\`\n` +
                `\`${settings.prefix}aichannel enable\`\n` +
                `\`${settings.prefix}aichannel disable\`\n`
            );

            return isSlash ? interaction.reply({ components: dashboard, flags: KyraUI.getFlags(true) }) : message.reply({ components: dashboard, flags: KyraUI.getFlags() }).catch(() => { });
        }
    }
};
