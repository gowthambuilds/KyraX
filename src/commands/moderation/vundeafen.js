import { KyraUI } from '#classes/KyraUI';
import { PermissionFlagsBits } from 'discord.js';

export default {
    name: 'vundeafen',
    description: 'Server undeafens a member in a voice channel',
    aliases: ['voiceundeafen'],
    slash: true,
    options: [
        { name: 'user', description: 'The user to voice undeafen', type: 6, required: true }
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
            return KyraUI.sendUsage({ client, message, interaction }, isSlash ? '/vundeafen user: <user>' : `${client.prefix}vundeafen <user>`);
        }

        if (!targetMember.voice.channel) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} This member is not in a voice channel.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        // Permission Checks
        if (!executor.permissions.has(PermissionFlagsBits.DeafenMembers)) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You need **Deafen Members** permissions.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        if (!guild.members.me.permissions.has(PermissionFlagsBits.DeafenMembers)) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} I need **Deafen Members** permissions.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        if (!targetMember.voice.serverDeaf) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} This member is not server deafened.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        try {
            await targetMember.voice.setDeaf(false, `Moderator: ${executor.user.tag}`);

            const successContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.success} **${targetMember.user.username}** has been server undeafened.`);
            return isSlash ? interaction.editReply({ components: successContainer }) : message.reply({ components: successContainer, flags: KyraUI.getFlags() });
        } catch (error) {
            client.logger.error('VUndeafen', 'Failed to voice undeafen member', error);
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} An error occurred while trying to voice undeafen this member.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }
    }
};

