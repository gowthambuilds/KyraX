import { KyraUI } from '#classes/KyraUI';
import { PermissionFlagsBits } from 'discord.js';
import { Infraction } from '#src/database/index.js';

export default {
    name: 'clearwarn',
    description: 'Clears all warnings for a user',
    slash: true,
    options: [
        { name: 'user', description: 'The user to clear warnings for', type: 6, required: true }
    ],
    async execute({ client, message, interaction, args }) {
        const isSlash = !!interaction;
        if (isSlash) await interaction.deferReply({ flags: KyraUI.getFlags() });

        const executor = isSlash ? interaction.member : message.member;
        const guild = isSlash ? interaction.guild : message.guild;

        // 1. Resolve Target
        const targetUser = isSlash
            ? interaction.options.getUser('user')
            : (message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null));

        if (!targetUser) {
            return KyraUI.sendUsage({ client, message, interaction }, isSlash ? '/clearwarn user: <user>' : `${client.prefix}clearwarn <@user>`);
        }

        // 2. Permission Checks
        if (!executor.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You need **Moderate Members** permissions.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        // 3. Action
        const result = await Infraction.deleteMany({ guildId: guild.id, userId: targetUser.id, type: 'warn' });

        if (result.deletedCount === 0) {
            const container = KyraUI.buildSimpleMessage(`${client.config.emojis.error} **${targetUser.tag}** has no warnings to clear.`);
            return isSlash ? interaction.editReply({ components: container, flags: KyraUI.getFlags() }) : message.reply({ components: container, flags: KyraUI.getFlags() });
        }

        const successContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.success} Cleared **${result.deletedCount}** warnings for **${targetUser.tag}**.`);
        return isSlash ? interaction.editReply({ components: successContainer, flags: KyraUI.getFlags() }) : message.reply({ components: successContainer, flags: KyraUI.getFlags() });
    }
};

