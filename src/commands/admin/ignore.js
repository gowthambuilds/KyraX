import { PermissionFlagsBits } from 'discord.js';
import { Guild } from '#src/database/index.js';
import { KyraUI } from '#classes/KyraUI';

export default {
    name: 'ignore',
    description: 'Manage ignored channels, users, and roles for bot features',
    slash: true,
    permissions: [PermissionFlagsBits.Administrator],
    options: [
        {
            name: 'channel',
            description: 'Manage ignored channels',
            type: 1,
            options: [
                { name: 'action', description: 'Add or remove', type: 3, required: true, choices: [{ name: 'Add', value: 'add' }, { name: 'Remove', value: 'remove' }] },
                { name: 'target', description: 'The channel to ignore', type: 7, required: true }
            ]
        },
        {
            name: 'user',
            description: 'Manage ignored users',
            type: 1,
            options: [
                { name: 'action', description: 'Add or remove', type: 3, required: true, choices: [{ name: 'Add', value: 'add' }, { name: 'Remove', value: 'remove' }] },
                { name: 'target', description: 'The user to ignore', type: 6, required: true }
            ]
        },
        {
            name: 'role',
            description: 'Manage ignored roles',
            type: 1,
            options: [
                { name: 'action', description: 'Add or remove', type: 3, required: true, choices: [{ name: 'Add', value: 'add' }, { name: 'Remove', value: 'remove' }] },
                { name: 'target', description: 'The role to ignore', type: 8, required: true }
            ]
        },
        {
            name: 'list',
            description: 'List all ignored entities',
            type: 1
        },
        {
            name: 'reset',
            description: 'Reset all ignore settings',
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
                '🔇 Ignore Configuration',
                'Manage which channels, users, or roles the bot should ignore for automation (AI, Auto-Responders, Auto-Reactors).',
                [
                    { name: 'channel <add|remove> <#channel>', value: 'Ignore/unignore a channel.' },
                    { name: 'user <add|remove> <@user>', value: 'Ignore/unignore a user.' },
                    { name: 'role <add|remove> <@role>', value: 'Ignore/unignore a role.' },
                    { name: 'list', value: 'View all ignore settings.' },
                    { name: 'reset', value: 'Clear all ignore settings.' }
                ]
            );
            return isSlash ? interaction.reply({ components: dashboard, flags: KyraUI.getFlags() }) : message.reply({ components: dashboard, flags: KyraUI.getFlags() });
        }

        switch (sub) {
            case 'channel':
            case 'user':
            case 'role': {
                const action = isSlash ? interaction.options.getString('action') : args[1]?.toLowerCase();
                const target = isSlash 
                    ? (sub === 'channel' ? interaction.options.getChannel('target') : (sub === 'user' ? interaction.options.getUser('target') : interaction.options.getRole('target')))
                    : (sub === 'channel' ? message.mentions.channels.first() : (sub === 'user' ? message.mentions.users.first() : message.mentions.roles.first()));

                if (!action || !target) {
                    return KyraUI.sendUsage({ client, message, interaction }, `ignore ${sub} <add|remove> <target>`);
                }

                const collectionKey = sub === 'channel' ? 'channels' : (sub === 'user' ? 'users' : 'roles');
                const list = guildData.ignored[collectionKey] || [];

                if (action === 'add') {
                    if (list.includes(target.id)) {
                        const err = KyraUI.buildSimpleMessage(`${client.config.emojis.error} That ${sub} is already ignored.`);
                        return isSlash ? interaction.reply({ components: err, flags: KyraUI.getFlags(true) }) : message.reply({ components: err, flags: KyraUI.getFlags(true) });
                    }
                    guildData.ignored[collectionKey].push(target.id);
                } else if (action === 'remove') {
                    if (!list.includes(target.id)) {
                        const err = KyraUI.buildSimpleMessage(`${client.config.emojis.error} That ${sub} is not currently ignored.`);
                        return isSlash ? interaction.reply({ components: err, flags: KyraUI.getFlags(true) }) : message.reply({ components: err, flags: KyraUI.getFlags(true) });
                    }
                    guildData.ignored[collectionKey] = list.filter(id => id !== target.id);
                } else {
                    return KyraUI.sendUsage({ client, message, interaction }, `ignore ${sub} <add|remove> <target>`);
                }

                await guildData.save();
                const success = KyraUI.buildSimpleMessage(`${client.config.emojis.success} Successfully ${action === 'add' ? 'added' : 'removed'} ${target} ${action === 'add' ? 'to' : 'from'} the ${sub} ignore list.`);
                return isSlash ? interaction.reply({ components: success, flags: KyraUI.getFlags() }) : message.reply({ components: success, flags: KyraUI.getFlags() });
            }

            case 'list': {
                const embed = KyraUI.buildDetailedDashboard(
                    '📋 Ignore List',
                    'The following entities are ignored by bot automation:',
                    [
                        { name: 'Channels', value: guildData.ignored.channels.length > 0 ? guildData.ignored.channels.map(id => `<#${id}>`).join(', ') : '_None_' },
                        { name: 'Users', value: guildData.ignored.users.length > 0 ? guildData.ignored.users.map(id => `<@${id}>`).join(', ') : '_None_' },
                        { name: 'Roles', value: guildData.ignored.roles.length > 0 ? guildData.ignored.roles.map(id => `<@&${id}>`).join(', ') : '_None_' }
                    ]
                );
                return isSlash ? interaction.reply({ components: embed, flags: KyraUI.getFlags() }) : message.reply({ components: embed, flags: KyraUI.getFlags() });
            }

            case 'reset': {
                guildData.ignored = { channels: [], users: [], roles: [] };
                await guildData.save();
                const success = KyraUI.buildSimpleMessage(`${client.config.emojis.success} Successfully reset all ignore settings.`);
                return isSlash ? interaction.reply({ components: success, flags: KyraUI.getFlags() }) : message.reply({ components: success, flags: KyraUI.getFlags() });
            }

            default:
                return KyraUI.sendUsage({ client, message, interaction }, 'ignore <channel|user|role|list|reset>');
        }
    }
};
