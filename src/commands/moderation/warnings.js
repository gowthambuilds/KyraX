import { KyraUI } from '#classes/KyraUI';
import { PermissionFlagsBits } from 'discord.js';
import { Infraction } from '#src/database/index.js';

export default {
    name: 'warnings',
    description: 'Lists all warnings for a member',
    slash: true,
    options: [
        { name: 'user', description: 'The user to check warnings for', type: 6, required: false }
    ],
    async execute({ client, message, interaction, args }) {
        const isSlash = !!interaction;
        if (isSlash) await interaction.deferReply({ flags: KyraUI.getFlags() });

        const executor = isSlash ? interaction.member : message.member;
        const guild = isSlash ? interaction.guild : message.guild;

        const targetUser = isSlash
            ? (interaction.options.getUser('user') || interaction.user)
            : (args[0] ? (message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null)) : message.author);

        if (!targetUser) {
            return KyraUI.sendUsage({ client, message, interaction }, isSlash ? '/warnings [user: user]' : `${client.prefix}warnings [user]`);
        }

        // Permission Checks
        if (!executor.permissions.has(PermissionFlagsBits.ModerateMembers) && targetUser.id !== executor.id) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You need **Moderate Members** permissions to view other users' warnings.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        const warnings = await Infraction.find({ guildId: guild.id, userId: targetUser.id, type: 'warn' }).sort({ timestamp: -1 });

        if (warnings.length === 0) {
            const container = KyraUI.buildSimpleMessage(`${client.config.emojis.success} **${targetUser.tag}** has no warnings.`);
            return isSlash ? interaction.editReply({ components: container, flags: KyraUI.getFlags() }) : message.reply({ components: container, flags: KyraUI.getFlags() });
        }

        let description = `Total Warnings: **${warnings.length}**\n\n`;
        warnings.slice(0, 10).forEach(w => {
            description += `${client.config.emojis.dot} **Case #${w.caseId}** | Reason: ${w.reason} | Moderator: <@${w.moderatorId}>\n`;
        });

        if (warnings.length > 10) description += `\n*Showing last 10 warnings...*`;

        const container = KyraUI.buildDashboard(`### 📋 Warnings for ${targetUser.username}`, description);
        return isSlash ? interaction.editReply({ components: container, flags: KyraUI.getFlags() }) : message.reply({ components: container, flags: KyraUI.getFlags() });
    }
};

