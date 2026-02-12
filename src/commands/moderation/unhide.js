import { KyraUI } from '#classes/KyraUI';
import { PermissionFlagsBits } from 'discord.js';

export default {
    name: 'unhide',
    description: 'Makes the current channel visible to @everyone',
    slash: true,
    async execute({ client, message, interaction, args }) {
        const isSlash = !!interaction;
        if (isSlash) await interaction.deferReply({ flags: KyraUI.getFlags() });

        const executor = isSlash ? interaction.member : message.member;
        const guild = isSlash ? interaction.guild : message.guild;

        const targetChannel = isSlash
            ? (interaction.options.getChannel('channel') || interaction.channel)
            : (message.mentions.channels.first() || guild.channels.cache.get(args[0]) || message.channel);

        // Permission Checks (Executor)
        if (!executor.permissions.has(PermissionFlagsBits.ManageChannels)) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You need **Manage Channels** permissions.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        // Permission Checks (Bot)
        if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} I need **Manage Channels** permissions.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        try {
            await targetChannel.permissionOverwrites.edit(guild.roles.everyone, {
                ViewChannel: null
            });

            const successContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.success} ${targetChannel} is now **visible** to @everyone.`);
            return isSlash ? interaction.editReply({ components: successContainer }) : message.reply({ components: successContainer, flags: KyraUI.getFlags() });
        } catch (error) {
            client.logger.error('Unhide', 'Failed to unhide channel', error);
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} An error occurred while trying to unhide the channel.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }
    }
};


