import { KyraUI } from '#classes/KyraUI';
import { PermissionFlagsBits } from 'discord.js';
import ms from 'ms';

export default {
    name: 'slowmode',
    description: 'Sets the slowmode for the current channel',
    slash: true,
    options: [
        { name: 'duration', description: 'Slowmode duration (e.g. 5s, 10m, off)', type: 3, required: true }
    ],
    async execute({ client, message, interaction, args }) {
        const isSlash = !!interaction;
        if (isSlash) await interaction.deferReply({ flags: KyraUI.getFlags() });
        const durationStr = isSlash ? interaction.options.getString('duration') : args[0];

        const executor = isSlash ? interaction.member : message.member;
        const channel = isSlash ? interaction.channel : message.channel;
        const guild = isSlash ? interaction.guild : message.guild;

        if (!durationStr) {
            return KyraUI.sendUsage({ client, message, interaction }, isSlash ? '/slowmode duration: <duration|off>' : `${client.prefix}slowmode <duration|off>`);
        }

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
            if (durationStr.toLowerCase() === 'off' || durationStr === '0') {
                await channel.setRateLimitPerUser(0);
                const successContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.success} Slowmode has been disabled.`);
                return isSlash ? interaction.editReply({ components: successContainer }) : message.reply({ components: successContainer, flags: KyraUI.getFlags() });
            }

            const durationMs = ms(durationStr);
            if (!durationMs || durationMs < 1000 || durationMs > 21600000) { // Max 6 hours
                const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Invalid duration. Use formats like 5s, 10m, 1h (Max 6 hours).`);
                return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
            }

            const seconds = Math.floor(durationMs / 1000);
            await channel.setRateLimitPerUser(seconds);

            const successContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.success} Slowmode set to **${ms(durationMs, { long: true })}**.`);
            return isSlash ? interaction.editReply({ components: successContainer }) : message.reply({ components: successContainer, flags: KyraUI.getFlags() });
        } catch (error) {
            client.logger.error('Slowmode', 'Failed to set slowmode', error);
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} An error occurred while trying to set slowmode.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }
    }
};

