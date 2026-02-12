import { KyraUI } from '#classes/KyraUI';
import { PermissionFlagsBits } from 'discord.js';

export default {
    name: 'vmute',
    description: 'Server mutes a member in a voice channel',
    aliases: ['voicemute'],
    slash: true,
    options: [
        { name: 'user', description: 'The user to voice mute', type: 6, required: true },
        { name: 'reason', description: 'Reason for the voice mute', type: 3, required: false }
    ],
    async execute({ client, message, interaction, args }) {
        const isSlash = !!interaction;
        if (isSlash) await interaction.deferReply({ flags: KyraUI.getFlags() });
        const guild = isSlash ? interaction.guild : message.guild;
        const executor = isSlash ? interaction.member : message.member;

        const targetMember = isSlash
            ? interaction.options.getMember('user')
            : message.mentions.members.filter(m => message.content.includes(m.id)).first();

        const reason = isSlash
            ? interaction.options.getString('reason') || 'No reason provided'
            : args.slice(1).join(' ') || 'No reason provided';

        if (!targetMember) {
            return KyraUI.sendUsage({ client, message, interaction }, isSlash ? '/vmute user: <user> [reason: reason]' : `${client.prefix}vmute <user> [reason]`);
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

        if (targetMember.voice.serverMute) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} This member is already voice muted.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        try {
            await targetMember.voice.setMute(true, `Moderator: ${executor.user.tag} | Reason: ${reason}`);

            const successContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.success} **${targetMember.user.username}** has been server muted.\n${client.config.emojis.dot} **Reason:** ${reason}`);
            return isSlash ? interaction.editReply({ components: successContainer }) : message.reply({ components: successContainer, flags: KyraUI.getFlags() });
        } catch (error) {
            client.logger.error('VMute', 'Failed to voice mute member', error);
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} An error occurred while trying to voice mute this member.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }
    }
};

