import { KyraUI } from '#classes/KyraUI';
import { PermissionFlagsBits, ChannelType } from 'discord.js';

export default {
    name: 'lockall',
    description: 'Locks all text channels in the server',
    aliases: ['lockserver'],
    slash: true,
    async execute({ client, message, interaction }) {
        const isSlash = !!interaction;
        const guild = isSlash ? interaction.guild : message.guild;
        const executor = isSlash ? interaction.member : message.member;

        // Permission Checks
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

        // Build list of channels that need locking
        const channelsToLock = [];
        for (const channel of channels.values()) {
            const currentOverwrites = channel.permissionOverwrites.cache.get(everyoneRole.id);
            if (!currentOverwrites || currentOverwrites.deny.has(PermissionFlagsBits.SendMessages) === false || currentOverwrites.allow.has(PermissionFlagsBits.SendMessages) === true) {
                channelsToLock.push(channel);
            }
        }

        // Perform locks concurrently
        const lockPromises = channelsToLock.map(ch => ch.permissionOverwrites.edit(everyoneRole, { SendMessages: false }, { reason: `Lockall command by ${executor.user.tag}` }).catch(err => {
            client.logger.error('Lockall', `Failed to lock channel ${ch.name}`, err);
            return null;
        }));

        const results = await Promise.allSettled(lockPromises);
        const lockedCount = results.filter(r => r.status === 'fulfilled' && r.value !== null).length;

        const successContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.success} Successfully locked **${lockedCount}** channels.`);
        return isSlash ? interaction.editReply({ components: successContainer }) : message.reply({ components: successContainer, flags: KyraUI.getFlags() });
    }
};
