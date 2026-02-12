import { KyraUI } from '#classes/KyraUI';
import { PermissionFlagsBits, ChannelType } from 'discord.js';

export default {
    name: 'hideall',
    description: 'Hides all text channels in the server',
    aliases: ['hideserver'],
    slash: true,
    async execute({ client, message, interaction }) {
        const isSlash = !!interaction;
        const guild = isSlash ? interaction.guild : message.guild;
        const executor = isSlash ? interaction.member : message.member;

        // Permission Checks
        if (!executor.permissions.has(PermissionFlagsBits.ManageChannels) && !executor.permissions.has(PermissionFlagsBits.Administrator)) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You need **Manage Channels** or **Administrator** permissions.`);
            return isSlash ? interaction.reply({ components: errorContainer, flags: KyraUI.getFlags() }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} I need **Manage Channels** permissions.`);
            return isSlash ? interaction.reply({ components: errorContainer, flags: KyraUI.getFlags() }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        const everyoneRole = guild.roles.everyone;
        const channels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement);

        if (isSlash) await interaction.deferReply({ flags: KyraUI.getFlags() });

        // Build list of channels that need hiding
        const channelsToHide = [];
        for (const channel of channels.values()) {
            const currentOverwrites = channel.permissionOverwrites.cache.get(everyoneRole.id);
            if (!currentOverwrites || currentOverwrites.deny.has(PermissionFlagsBits.ViewChannel) === false || currentOverwrites.allow.has(PermissionFlagsBits.ViewChannel) === true) {
                channelsToHide.push(channel);
            }
        }

        // Perform hides concurrently
        const hidePromises = channelsToHide.map(ch => ch.permissionOverwrites.edit(everyoneRole, { ViewChannel: false }, { reason: `Hideall command by ${executor.user.tag}` }).catch(err => {
            client.logger.error('Hideall', `Failed to hide channel ${ch.name}`, err);
            return null;
        }));

        const results = await Promise.allSettled(hidePromises);
        const hiddenCount = results.filter(r => r.status === 'fulfilled' && r.value !== null).length;

        const successContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.success} Successfully hidden **${hiddenCount}** channels.`);
        return isSlash ? interaction.editReply({ components: successContainer }) : message.reply({ components: successContainer, flags: KyraUI.getFlags() });
    }
};
