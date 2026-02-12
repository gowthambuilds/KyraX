import { KyraUI } from '#classes/KyraUI';
import { PermissionFlagsBits } from 'discord.js';

export default {
    name: 'nick',
    description: "Changes a member's nickname",
    aliases: ['nickname', 'setnick'],
    slash: true,
    options: [
        { name: 'nickname', description: 'The new nickname (use "reset" to clear)', type: 3, required: true },
        { name: 'user', description: 'The user to change nickname for', type: 6, required: false }
    ],
    async execute({ client, message, interaction, args }) {
        const isSlash = !!interaction;
        const guild = isSlash ? interaction.guild : message.guild;
        const executor = isSlash ? interaction.member : message.member;

        let target = isSlash
            ? interaction.options.getMember('user') || executor
            : message.mentions.members.first() || executor;

        let newNickname = isSlash
            ? interaction.options.getString('nickname')
            : (message.mentions.members.first() ? args.slice(1).join(' ') : args.join(' '));

        if (!newNickname) {
            const errorData = { content: 'Please provide a new nickname or "reset" to clear.', flags: KyraUI.getFlags(true) };
            return isSlash ? interaction.reply(errorData) : message.reply(errorData).then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000)).catch(() => { });
        }

        // Check permissions
        if (target.id !== executor.id && !executor.permissions.has(PermissionFlagsBits.ManageNicknames)) {
            const errorData = { content: 'You need `Manage Nicknames` permission to change others\' nicknames.', flags: KyraUI.getFlags(true) };
            return isSlash ? interaction.reply(errorData) : message.reply(errorData).then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000)).catch(() => { });
        }

        if (target.id === executor.id && !executor.permissions.has(PermissionFlagsBits.ChangeNickname)) {
            const errorData = { content: 'You do not have permission to change your own nickname.', flags: KyraUI.getFlags(true) };
            return isSlash ? interaction.reply(errorData) : message.reply(errorData).then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000)).catch(() => { });
        }

        const isReset = ['reset', 'clear', 'none'].includes(newNickname.toLowerCase());
        const oldNickname = target.displayName;

        try {
            await target.setNickname(isReset ? null : newNickname);

            const successContent = isReset
                ? `Successfully reset nickname for **${target.user.username}**.`
                : `Changed nickname for **${target.user.username}**.\n\n` +
                `${client.config.emojis.dot} *${oldNickname}* → **${newNickname}**`;

            const container = KyraUI.buildDashboard(
                `### ${client.config.emojis.success} **Nickname Updated**`,
                successContent
            );

            const responseData = {
                components: container,
                flags: KyraUI.getFlags()
            };

            if (isSlash) {
                await interaction.reply(responseData);
            } else {
                await message.reply(responseData).catch(() => { });
            }
        } catch (err) {
            const errorData = { content: 'I am unable to change this user\'s nickname. My role might be below theirs.', flags: KyraUI.getFlags(true) };
            return isSlash ? interaction.reply(errorData) : message.reply(errorData).then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000)).catch(() => { });
        }
    }
};
