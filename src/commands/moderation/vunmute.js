import { KyraUI } from '#classes/KyraUI';
import { PermissionFlagsBits } from 'discord.js';

export default {
    name: 'vunmute',
    description: 'Server unmutes a member in a voice channel',
    aliases: ['voiceunmute'],
    slash: true,
    options: [
        { name: 'user', description: 'The user to voice unmute', type: 6, required: true }
    ],
    async execute({ client, message, interaction, args }) {
        const isSlash = !!interaction;
        if (isSlash) await interaction.deferReply({ flags: KyraUI.getFlags() });
        const guild = isSlash ? interaction.guild : message.guild;
        const executor = isSlash ? interaction.member : message.member;

        const targetMember = isSlash
            ? interaction.options.getMember('user')
            : message.mentions.members.filter(m => message.content.includes(m.id)).first();

        if (!targetMember) {
            return KyraUI.sendUsage({ client, message, interaction }, isSlash ? '/vunmute user: <user>' : `${client.prefix}vunmute <user>`);
        }

        if (!targetMember.voice.channel) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} This member is not in a voice channel.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        // Permission Checks
        if (!executor.permissions.has(PermissionFlagsBits.MuteMembers)) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You need **Mute Members** permissions.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        if (!guild.members.me.permissions.has(PermissionFlagsBits.MuteMembers)) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} I need **Mute Members** permissions.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        if (!targetMember.voice.serverMute) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} This member is not server muted.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        try {
            await targetMember.voice.setMute(false, `Moderator: ${executor.user.tag}`);

            const successContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.success} **${targetMember.user.username}** has been server unmuted.`);
            return isSlash ? interaction.editReply({ components: successContainer }) : message.reply({ components: successContainer, flags: KyraUI.getFlags() });
        } catch (error) {
            client.logger.error('VUnmute', 'Failed to voice unmute member', error);
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} An error occurred while trying to voice unmute this member.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }
    }
};

