import { PermissionFlagsBits } from 'discord.js';
import { AutoResponse } from '#src/database/index.js';
import { KyraUI } from '#classes/KyraUI';
import { Pagination } from '#src/utils/Pagination.js';

export default {
    name: 'autoresponder',
    aliases: ['ar'],
    description: 'Manage auto-responders',
    slash: true,
    permissions: [PermissionFlagsBits.Administrator],
    options: [
        {
            name: 'add',
            description: 'Add a new auto-responder',
            type: 1,
            options: [
                {
                    name: 'trigger',
                    description: 'The phrase to trigger the response',
                    type: 3,
                    required: true
                },
                {
                    name: 'response',
                    description: 'The response message',
                    type: 3,
                    required: true
                }
            ]
        },
        {
            name: 'remove',
            description: 'Remove an auto-responder',
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
            description: 'List all auto-responders',
            type: 1
        },
        {
            name: 'reset',
            description: 'Remove all auto-responders',
            type: 1
        }
    ],
    async execute({ client, interaction, message, args }) {
        const isSlash = !!interaction;
        const sub = isSlash ? interaction.options.getSubcommand() : args[0]?.toLowerCase();
        const guildId = isSlash ? interaction.guildId : message.guild.id;

        if (!sub) {
            const dashboard = KyraUI.buildDetailedDashboard(
                '🤖 Auto-Responder Commands',
                'Automatically respond to text triggers.',
                [
                    { name: 'add <trigger> <response>', value: 'Add a new auto-response.' },
                    { name: 'remove <trigger>', value: 'Remove an auto-response.' },
                    { name: 'list', value: 'List all auto-responses.' },
                    { name: 'reset', value: 'Remove all auto-responses.' }
                ]
            );
            return isSlash ? interaction.reply({ components: dashboard, flags: KyraUI.getFlags() }) : message.reply({ components: dashboard, flags: KyraUI.getFlags() });
        }

        switch (sub) {
            case 'add': {
                const trigger = isSlash ? interaction.options.getString('trigger') : args[1];
                const response = isSlash ? interaction.options.getString('response') : args.slice(2).join(' ');

                if (!trigger || !response) return KyraUI.sendUsage({ client, message, interaction }, 'autoresponder add <trigger> <response>');

                const existing = await AutoResponse.findOne({ guildId, trigger: trigger.toLowerCase() });
                if (existing) {
                    const err = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Auto-responder for "${trigger}" already exists.`);
                    return isSlash ? interaction.reply({ components: err, flags: KyraUI.getFlags(true) }) : message.reply({ components: err, flags: KyraUI.getFlags(true) });
                }

                await AutoResponse.create({ guildId, trigger: trigger.toLowerCase(), response });

                const success = KyraUI.buildSimpleMessage(`${client.config.emojis.success} **Auto-Responder Added**\n${client.config.emojis.dot} Trigger: \`${trigger}\`\n${client.config.emojis.dot} Response: \`${response}\``);
                return isSlash ? interaction.reply({ components: success, flags: KyraUI.getFlags() }) : message.reply({ components: success, flags: KyraUI.getFlags() });
            }

            case 'remove': {
                const trigger = isSlash ? interaction.options.getString('trigger') : args.slice(1).join(' ');
                if (!trigger) return KyraUI.sendUsage({ client, message, interaction }, 'autoresponder remove <trigger>');

                const deleted = await AutoResponse.findOneAndDelete({ guildId, trigger: trigger.toLowerCase() });
                if (!deleted) {
                    const err = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Auto-responder for "${trigger}" not found.`);
                    return isSlash ? interaction.reply({ components: err, flags: KyraUI.getFlags(true) }) : message.reply({ components: err, flags: KyraUI.getFlags(true) });
                }

                const success = KyraUI.buildSimpleMessage(`${client.config.emojis.success} **Auto-Responder Removed**\n${client.config.emojis.dot} Trigger: \`${trigger}\``);
                return isSlash ? interaction.reply({ components: success, flags: KyraUI.getFlags() }) : message.reply({ components: success, flags: KyraUI.getFlags() });
            }

            case 'list': {
                const responders = await AutoResponse.find({ guildId });
                const items = responders.map((ar, i) => `**${i + 1}.** \`${ar.trigger}\` -> \`${ar.response}\``);
                const title = `🤖 Auto-Responders (${responders.length})`;

                if (responders.length === 0) {
                    const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} No auto-responders configured.`);
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
                const count = await AutoResponse.countDocuments({ guildId });
                if (count === 0) {
                    const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} No auto-responders to reset.`);
                    return isSlash ? interaction.reply({ components: msg, flags: KyraUI.getFlags(true) }) : message.reply({ components: msg, flags: KyraUI.getFlags(true) });
                }

                await AutoResponse.deleteMany({ guildId });

                const success = KyraUI.buildSimpleMessage(`${client.config.emojis.success} **Reset Successful**\n${client.config.emojis.dot} Removed ${count} auto-responders.`);
                return isSlash ? interaction.reply({ components: success, flags: KyraUI.getFlags() }) : message.reply({ components: success, flags: KyraUI.getFlags() });
            }

            default:
                return KyraUI.sendUsage({ client, message, interaction }, 'autoresponder <add|remove|list|reset>');
        }
    }
};
