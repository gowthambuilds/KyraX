import { KyraUI } from '#classes/KyraUI';
import { PermissionFlagsBits, ChannelType } from 'discord.js';

export default {
    name: 'unhideall',
    description: 'Unhides all text channels in the server',
    aliases: ['unhideserver'],
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

        // Build list of channels that need unhiding
        const channelsToUnhide = [];
        for (const channel of channels.values()) {
            const currentOverwrites = channel.permissionOverwrites.cache.get(everyoneRole.id);
            if (currentOverwrites && currentOverwrites.deny.has(PermissionFlagsBits.ViewChannel)) {
                channelsToUnhide.push(channel);
            }
        }

        // Perform unhides concurrently
        const unhidePromises = channelsToUnhide.map(ch => ch.permissionOverwrites.edit(everyoneRole, { ViewChannel: null }, { reason: `Unhideall command by ${executor.user.tag}` }).catch(err => {
            client.logger.error('Unhideall', `Failed to unhide channel ${ch.name}`, err);
            return null;
        }));

        const results = await Promise.allSettled(unhidePromises);
        const unhiddenCount = results.filter(r => r.status === 'fulfilled' && r.value !== null).length;

        const successContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.success} Successfully unhidden **${unhiddenCount}** channels.`);
        return isSlash ? interaction.editReply({ components: successContainer }) : message.reply({ components: successContainer, flags: KyraUI.getFlags() });
    }
};
