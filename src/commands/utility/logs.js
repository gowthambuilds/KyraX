import { KyraUI } from '#classes/KyraUI';
import { PermissionFlagsBits, ChannelType, OverwriteType } from 'discord.js';
import { Guild } from '#src/database/index.js';

export default {
    name: 'logs',
    description: 'Manage the advanced server logging system',
    slash: true,
    options: [
        {
            name: 'create',
            description: 'Create logging category and channels (Auto-enables)',
            type: 1
        },
        {
            name: 'enable',
            description: 'Enable logging if channels are already created',
            type: 1
        },
        {
            name: 'disable',
            description: 'Temporarily disable logging without deleting channels',
            type: 1
        },
        {
            name: 'delete',
            description: 'Delete the logging category and channels (Owner Only)',
            type: 1
        }
    ],
    async execute({ client, message, interaction, args }) {
        const isSlash = !!interaction;
        const subcommand = isSlash ? interaction.options.getSubcommand() : args[0]?.toLowerCase();
        const guild = isSlash ? interaction.guild : message.guild;
        const executor = isSlash ? interaction.member : message.member;

        // Permissions Check
        if (!executor.permissions.has(PermissionFlagsBits.Administrator)) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You need **Administrator** permissions to manage logs.`);
            return isSlash ? interaction.reply({ components: errorContainer, flags: KyraUI.getFlags(true) }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} I need **Manage Channels** permissions to set up the logging system.`);
            return isSlash ? interaction.reply({ components: errorContainer, flags: KyraUI.getFlags(true) }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        const guildData = await Guild.findById(guild.id);

        if (subcommand === 'create') {
            if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
                const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} I need **Manage Channels** permissions to create the logging system.`);
                return isSlash ? interaction.reply({ components: errorContainer, flags: KyraUI.getFlags(true) }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
            }

            if (guildData?.logging?.categoryId) {
                const infoContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Logging channels already exist. Use \`logs delete\` first if you want to recreate them.`);
                return isSlash ? interaction.reply({ components: infoContainer, flags: KyraUI.getFlags() }) : message.reply({ components: infoContainer, flags: KyraUI.getFlags() });
            }

            const loadingContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.loading} **Creating Kyra X Logging System...**\n*Building 9 refined log channels.*`);
            const statusMsg = isSlash ? await interaction.reply({ components: loadingContainer, fetchReply: true, flags: KyraUI.getFlags() }) : await message.reply({ components: loadingContainer, flags: KyraUI.getFlags() });

            try {
                // 1. Create Category
                const category = await guild.channels.create({
                    name: 'Kyra X Logs',
                    type: ChannelType.GuildCategory,
                    permissionOverwrites: [
                        {
                            id: guild.roles.everyone.id,
                            deny: [PermissionFlagsBits.ViewChannel],
                            type: OverwriteType.Role
                        },
                        {
                            id: client.user.id,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                            type: OverwriteType.Member
                        }
                    ]
                });

                const consolidatedGroups = [
                    { name: '◟︰alerts-logs﹒៹', keys: ['important'] },
                    { name: '◟︰mod-logs﹒៹', keys: ['moderation'] },
                    { name: '◟︰gateway-logs﹒៹', keys: ['gateway'] },
                    { name: '◟︰member-logs﹒៹', keys: ['member', 'invite'] },
                    { name: '◟︰message-logs﹒៹', keys: ['message'] },
                    { name: '◟︰voice-logs﹒៹', keys: ['voice'] },
                    { name: '◟︰channel-logs﹒៹', keys: ['channel', 'thread'] },
                    { name: '◟︰server-role-logs﹒៹', keys: ['server', 'role'] },
                    { name: '◟︰utility-logs﹒៹', keys: ['webhook', 'emoji', 'event', 'bot'] }
                ];

                const channelIds = {};
                for (const group of consolidatedGroups) {
                    const ch = await guild.channels.create({
                        name: group.name,
                        type: ChannelType.GuildText,
                        parent: category.id
                    });

                    group.keys.forEach(key => {
                        channelIds[key] = ch.id;
                    });
                }

                await Guild.findByIdAndUpdate(guild.id, {
                    'logging.enabled': true,
                    'logging.categoryId': category.id,
                    'logging.channels': channelIds
                }, { upsert: true });

                const successContainer = KyraUI.buildDashboard(
                    `### ${client.config.emojis.success} **Logging Created & Enabled**`,
                    `The logging system has been successfully initialized.\n\n` +
                    `${client.config.emojis.dot} **Channels:** 9 refined categories created.\n` +
                    `${client.config.emojis.dot} **Status:** Operational (Auto-Enabled)`
                );

                return isSlash ? interaction.editReply({ components: successContainer }) : statusMsg.edit({ components: successContainer });

            } catch (error) {
                client.logger.error('Logs', 'Failed to create logging', error);
                const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Failed to create channels. Power cycle the bot or check permissions.`);
                return isSlash ? interaction.editReply({ components: errorContainer }) : statusMsg.edit({ components: errorContainer });
            }
        }

        if (subcommand === 'enable') {
            if (!guildData?.logging?.categoryId) {
                const infoContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} No logging channels found. Use \`logs create\` first.`);
                return isSlash ? interaction.reply({ components: infoContainer, flags: KyraUI.getFlags() }) : message.reply({ components: infoContainer, flags: KyraUI.getFlags() });
            }

            if (guildData?.logging?.enabled) {
                const infoContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.dot} Logging is already enabled.`);
                return isSlash ? interaction.reply({ components: infoContainer, flags: KyraUI.getFlags() }) : message.reply({ components: infoContainer, flags: KyraUI.getFlags() });
            }

            await Guild.findByIdAndUpdate(guild.id, { 'logging.enabled': true });
            const successContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.success} Logging system has been **enabled**.`);
            return isSlash ? interaction.reply({ components: successContainer, flags: KyraUI.getFlags() }) : message.reply({ components: successContainer, flags: KyraUI.getFlags() });
        }

        if (subcommand === 'disable') {
            if (!guildData?.logging?.enabled) {
                const infoContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.dot} Logging is already disabled.`);
                return isSlash ? interaction.reply({ components: infoContainer, flags: KyraUI.getFlags() }) : message.reply({ components: infoContainer, flags: KyraUI.getFlags() });
            }

            await Guild.findByIdAndUpdate(guild.id, { 'logging.enabled': false });
            const successContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.success} Logging system has been **disabled**.`);
            return isSlash ? interaction.reply({ components: successContainer, flags: KyraUI.getFlags() }) : message.reply({ components: successContainer, flags: KyraUI.getFlags() });
        }

        if (subcommand === 'delete') {
            if (executor.id !== guild.ownerId) {
                const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Only the **Server Owner** can delete the logging system.`);
                return isSlash ? interaction.reply({ components: errorContainer, flags: KyraUI.getFlags(true) }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
            }

            const loadingContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.loading} **Deleting Logging System...**`);
            const statusMsg = isSlash ? await interaction.reply({ components: loadingContainer, fetchReply: true, flags: KyraUI.getFlags() }) : await message.reply({ components: loadingContainer, flags: KyraUI.getFlags() });

            try {
                const categoryId = guildData?.logging?.categoryId;
                const channelIds = guildData?.logging?.channels;

                if (categoryId) {
                    const category = await guild.channels.fetch(categoryId).catch(() => null);
                    if (category) {
                        const children = guild.channels.cache.filter(c => c.parentId === categoryId);
                        for (const [, ch] of children) await ch.delete().catch(() => { });
                        await category.delete().catch(() => { });
                    }
                }

                if (channelIds) {
                    const uniqueIds = new Set(Object.values(channelIds));
                    for (const id of uniqueIds) if (id) await guild.channels.delete(id).catch(() => { });
                }

                await Guild.findByIdAndUpdate(guild.id, {
                    'logging.enabled': false,
                    'logging.categoryId': null,
                    'logging.channels': {}
                });

                const successContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.success} Logging system deleted successfully.`);
                return isSlash ? interaction.editReply({ components: successContainer }) : statusMsg.edit({ components: successContainer });

            } catch (error) {
                client.logger.error('Logs', 'Failed to delete logging', error);
                const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} An error occurred during deletion.`);
                return isSlash ? interaction.editReply({ components: errorContainer }) : statusMsg.edit({ components: errorContainer });
            }
        }

        const infoContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.dot} Use \`logs create\`, \`logs enable\`, \`logs disable\`, or \`logs delete\`.`);
        return isSlash ? interaction.reply({ components: infoContainer, flags: KyraUI.getFlags(true) }) : message.reply({ components: infoContainer, flags: KyraUI.getFlags() });
    }
};
