import { PermissionFlagsBits } from 'discord.js';
import { AutoReactor } from '#src/database/index.js';
import { KyraUI } from '#classes/KyraUI';
import { Pagination } from '#src/utils/Pagination.js';

export default {
    name: 'autoreact',
    aliases: ['react'],
    description: 'Manage auto-reactions',
    slash: true,
    permissions: [PermissionFlagsBits.Administrator],
    options: [
        {
            name: 'add',
            description: 'Add a new auto-reaction',
            type: 1,
            options: [
                {
                    name: 'trigger',
                    description: 'The phrase to trigger the reaction',
                    type: 3,
                    required: true
                },
                {
                    name: 'emoji',
                    description: 'The emoji to react with',
                    type: 3,
                    required: true
                }
            ]
        },
        {
            name: 'remove',
            description: 'Remove an auto-reaction',
            type: 1,
            options: [
                {
                    name: 'trigger',
                    description: 'The trigger phrase to remove',
                    type: 3,
                    required: true
                }
            ]
        },
        {
            name: 'list',
            description: 'List all auto-reactions',
            type: 1
        },
        {
            name: 'reset',
            description: 'Remove all auto-reactions',
            type: 1
        }
    ],
    async execute({ client, interaction, message, args }) {
        const isSlash = !!interaction;
        const sub = isSlash ? interaction.options.getSubcommand() : args[0]?.toLowerCase();
        const guildId = isSlash ? interaction.guildId : message.guild.id;

        if (!sub) {
            const dashboard = KyraUI.buildDetailedDashboard(
                '🎭 Auto-React Commands',
                'Automatically react to text triggers.',
                [
                    { name: 'add <trigger> <emoji>', value: 'Add a new auto-reaction.' },
                    { name: 'remove <trigger>', value: 'Remove an auto-reaction.' },
                    { name: 'list', value: 'List all auto-reactions.' },
                    { name: 'reset', value: 'Remove all auto-reactions.' }
                ]
            );
            return isSlash ? interaction.reply({ components: dashboard, flags: KyraUI.getFlags() }) : message.reply({ components: dashboard, flags: KyraUI.getFlags() });
        }

        switch (sub) {
            case 'add': {
                const trigger = isSlash ? interaction.options.getString('trigger') : args[1];
                const emoji = isSlash ? interaction.options.getString('emoji') : args[2];

                if (!trigger || !emoji) return KyraUI.sendUsage({ client, message, interaction }, 'autoreact add <trigger> <emoji>');

                const existing = await AutoReactor.findOne({ guildId, trigger: trigger.toLowerCase() });
                if (existing) {
                    const err = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Auto-reaction for "${trigger}" already exists.`);
                    return isSlash ? interaction.reply({ components: err, flags: KyraUI.getFlags(true) }) : message.reply({ components: err, flags: KyraUI.getFlags(true) });
                }

                await AutoReactor.create({ guildId, trigger: trigger.toLowerCase(), emoji });

                const success = KyraUI.buildSimpleMessage(`${client.config.emojis.success} **Auto-Reaction Added**\n${client.config.emojis.dot} Trigger: \`${trigger}\`\n${client.config.emojis.dot} Emoji: ${emoji}`);
                return isSlash ? interaction.reply({ components: success, flags: KyraUI.getFlags() }) : message.reply({ components: success, flags: KyraUI.getFlags() });
            }

            case 'remove': {
                const trigger = isSlash ? interaction.options.getString('trigger') : args.slice(1).join(' ');
                if (!trigger) return KyraUI.sendUsage({ client, message, interaction }, 'autoreact remove <trigger>');

                const deleted = await AutoReactor.findOneAndDelete({ guildId, trigger: trigger.toLowerCase() });
                if (!deleted) {
                    const err = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Auto-reaction for "${trigger}" not found.`);
                    return isSlash ? interaction.reply({ components: err, flags: KyraUI.getFlags(true) }) : message.reply({ components: err, flags: KyraUI.getFlags(true) });
                }

                const success = KyraUI.buildSimpleMessage(`${client.config.emojis.success} **Auto-Reaction Removed**\n${client.config.emojis.dot} Trigger: \`${trigger}\``);
                return isSlash ? interaction.reply({ components: success, flags: KyraUI.getFlags() }) : message.reply({ components: success, flags: KyraUI.getFlags() });
            }

            case 'list': {
                const reactors = await AutoReactor.find({ guildId });
                const items = reactors.map((ar, i) => `**${i + 1}.** \`${ar.trigger}\` -> ${ar.emoji}`);
                const title = `🎭 Auto-Reactions (${reactors.length})`;

                if (reactors.length === 0) {
                    const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} No auto-reactions configured.`);
                    return isSlash ? interaction.reply({ components: msg, flags: KyraUI.getFlags(true) }) : message.reply({ components: msg, flags: KyraUI.getFlags(true) });
                }

                return Pagination.create({
                    client,
                    interaction,
                    message,
                    title,
                    items,
                    itemsPerPage: 10
                });
            }

            case 'reset': {
                const count = await AutoReactor.countDocuments({ guildId });
                if (count === 0) {
                    const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} No auto-reactions to reset.`);
                    return isSlash ? interaction.reply({ components: msg, flags: KyraUI.getFlags(true) }) : message.reply({ components: msg, flags: KyraUI.getFlags(true) });
                }

                await AutoReactor.deleteMany({ guildId });

                const success = KyraUI.buildSimpleMessage(`${client.config.emojis.success} **Reset Successful**\n${client.config.emojis.dot} Removed ${count} auto-reactions.`);
                return isSlash ? interaction.reply({ components: success, flags: KyraUI.getFlags() }) : message.reply({ components: success, flags: KyraUI.getFlags() });
            }

            default:
                return KyraUI.sendUsage({ client, message, interaction }, 'autoreact <add|remove|list|reset>');
        }
    }
};
