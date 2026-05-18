import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags, PermissionFlagsBits } from 'discord.js';
import ms from 'ms';
import { KyraUI } from '#classes/KyraUI';

export default {
    name: 'gstart',
    description: 'Start a new giveaway',
    aliases: ['giveaway', 'gcreate'],
    slash: true,
    permissions: [PermissionFlagsBits.ManageGuild],
    options: [
        { name: 'duration', description: 'Duration (e.g., 1h, 24h, 1d)', type: 3, required: true },
        { name: 'winners', description: 'Number of winners', type: 4, required: true, min_value: 1, max_value: 20 },
        { name: 'prize', description: 'The prize for the giveaway', type: 3, required: true }
    ],
    async execute({ client, message, interaction, args }) {
        const isSlash = !!interaction;
        const durationStr = isSlash ? interaction.options.getString('duration') : args[0];
        const winnersCount = isSlash ? interaction.options.getInteger('winners') : parseInt(args[1]);
        const prize = isSlash ? interaction.options.getString('prize') : args.slice(2).join(' ');

        if (!durationStr || isNaN(winnersCount) || !prize) {
            const errorMsg = `### ${client.config.emojis.error} **Invalid Arguments**\n\n` +
                `**Usage:** \`gstart <duration> <winners> <prize>\`\n` +
                `**Example:** \`gstart 1h 1 Nitro Classic\``;

            if (isSlash) return interaction.reply({ content: errorMsg, flags: KyraUI.getFlags(true) });
            return message.reply({ content: errorMsg, allowedMentions: { repliedUser: false } }).then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000)).catch(() => { });
        }

        const duration = ms(durationStr);
        if (!duration || duration < 10000 || duration > 2592000000) {
            const errorMsg = `${client.config.emojis.error} **Invalid Duration!** Please provide a valid time format (e.g., \`1m\`, \`1h\`, \`1d\`). Max: 30 days.`;
            if (isSlash) return interaction.reply({ content: errorMsg, flags: KyraUI.getFlags(true) });
            return message.reply({ content: errorMsg, allowedMentions: { repliedUser: false } }).then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000)).catch(() => { });
        }

        try {
            const channel = isSlash ? interaction.channel : message.channel;
            const host = isSlash ? interaction.user : message.author;

            await client.giveaways.create({
                channel,
                prize,
                winners: winnersCount,
                duration,
                host
            });

            const successMsg = `${client.config.emojis.success} **Giveaway Started!** Check the channel <#${channel.id}>.`;
            if (isSlash) return interaction.reply({ content: successMsg, flags: KyraUI.getFlags(true) });

            // Delete user's message if it was a prefix command
            message.delete().catch(() => { });

            return message.reply({ content: successMsg, allowedMentions: { repliedUser: false } }).then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000)).catch(() => { });

        } catch (error) {
            client.logger.error('GSTART', 'Failed to start giveaway', error);
            const errorMsg = `${client.config.emojis.error} Failed to start giveaway. Please check my permissions.`;
            if (isSlash) return interaction.reply({ content: errorMsg, flags: KyraUI.getFlags(true) });
            return message.reply({ content: errorMsg, allowedMentions: { repliedUser: false } }).then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000)).catch(() => { });
        }
    }
};
