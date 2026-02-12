import { KyraUI } from '#classes/KyraUI';
import { PermissionFlagsBits } from 'discord.js';

export default {
    name: 'perms',
    description: 'Shows the permissions of a user in the server.',
    aliases: ['permissions'],
    usage: '[@user]',
    slash: true,
    async execute({ client, message, interaction, args }) {
        const isSlash = !!interaction;
        const guild = isSlash ? interaction.guild : message.guild;

        let target;
        if (isSlash) {
            target = interaction.options.getMember('user') || interaction.member;
        } else {
            target = message.mentions.members.first() ||
                guild.members.cache.get(args[0]) ||
                message.member;
        }

        const permissions = target.permissions.toArray();

        // Key permissions to highlight
        const keyPerms = [
            'Administrator', 'ManageGuild', 'ManageRoles', 'ManageChannels',
            'KickMembers', 'BanMembers', 'ManageMessages', 'MentionEveryone',
            'MuteMembers', 'DeafenMembers', 'MoveMembers', 'ManageNicknames',
            'ManageEmojisAndStickers', 'ManageWebhooks'
        ];

        const hasPerms = permissions
            .filter(p => keyPerms.includes(p))
            .map(p => `${client.config.emojis.dot} \`${p.replace(/([A-Z])/g, ' $1').trim()}\``);

        const content = hasPerms.length > 0
            ? `Key permissions for **${target.user.tag}**:\n\n${hasPerms.join('\n')}`
            : `**${target.user.tag}** has no administrative or management permissions.`;

        const container = KyraUI.buildDashboard(
            `### 🛡️ **User Permissions**`,
            content
        );

        const responseData = { components: container, flags: KyraUI.getFlags() };
        return isSlash ? interaction.reply(responseData) : message.reply(responseData);
    }
};
