import { KyraUI } from '#classes/KyraUI';
import { Member } from '#src/database/index.js';

export default {
    name: 'afk',
    description: 'Sets your AFK status',
    slash: true,
    options: [
        { name: 'reason', description: 'Reason for being AFK', type: 3, required: false }
    ],
    async execute({ client, message, interaction, args }) {
        const isSlash = !!interaction;
        const user = isSlash ? interaction.user : message.author;
        const member = isSlash ? interaction.member : message.member;
        const reason = isSlash
            ? interaction.options.getString('reason') || 'AFK'
            : args.join(' ') || 'AFK';

        const guildId = isSlash ? interaction.guildId : message.guild.id;

        await Member.findOneAndUpdate(
            { guildId, userId: user.id },
            {
                'afk.status': true,
                'afk.reason': reason,
                'afk.timestamp': Date.now()
            },
            { upsert: true }
        );

        // Try to update nickname
        try {
            if (!member.displayName.startsWith('[AFK]')) {
                await member.setNickname(`[AFK] ${member.displayName.slice(0, 26)}`).catch(() => { });
            }
        } catch (e) { }

        const container = KyraUI.buildDashboard(
            `### 💤 **AFK Status Set**`,
            `**${user.username}**, I've set your AFK status.\n\n` +
            `${client.config.emojis.dot} **Reason:** ${reason}\n` +
            `${client.config.emojis.dot} *I'll remove it once you send a message.*`
        );

        const responseData = {
            components: container,
            flags: KyraUI.getFlags()
        };

        if (isSlash) {
            await interaction.reply(responseData);
        } else {
            await message.reply(responseData);
        }
    }
};
