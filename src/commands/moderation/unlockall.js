import { KyraUI } from '#classes/KyraUI';
import { PermissionFlagsBits, ChannelType } from 'discord.js';

export default {
    name: 'unlockall',
    description: 'Unlocks all text channels in the server',
    aliases: ['unlockserver'],
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

        const channelsToEdit = [];
        for (const channel of channels.values()) {
            const currentOverwrites = channel.permissionOverwrites.cache.get(everyoneRole.id);
            if (currentOverwrites && currentOverwrites.deny.has(PermissionFlagsBits.SendMessages)) channelsToEdit.push(channel);
        }

        // Perform edits concurrently and wait for results
        const editPromises = channelsToEdit.map(ch => ch.permissionOverwrites.edit(everyoneRole, { SendMessages: null }, { reason: `Unlockall command by ${executor.user.tag}` }).catch(err => {
            client.logger.error('Unlockall', `Failed to unlock channel ${ch.name}`, err);
            return null;
        }));

        const results = await Promise.allSettled(editPromises);
        const unlockedCount = results.filter(r => r.status === 'fulfilled' && r.value !== null).length;

        const successContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.success} Successfully unlocked **${unlockedCount}** channels.`);
        return isSlash ? interaction.editReply({ components: successContainer }) : message.reply({ components: successContainer, flags: KyraUI.getFlags() });
    }
};
