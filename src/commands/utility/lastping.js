import { KyraUI } from '#classes/KyraUI';
import { User } from '#src/database/index.js';
import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize } from 'discord.js';

export default {
    name: 'lastping',
    description: 'Show the last 5 pings received by the user',
    aliases: ['lp'],
    slash: true,
    async execute({ client, message, interaction }) {
        const isSlash = !!interaction;
        const user = isSlash ? interaction.user : message.author;

        const userData = await User.findById(user.id);

        if (!userData || !userData.lastPings || userData.lastPings.length === 0) {
            const noPings = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You haven't received any pings recently.`);
            return isSlash ? interaction.reply({ components: noPings, flags: KyraUI.getFlags() }) : message.reply({ components: noPings, flags: KyraUI.getFlags() });
        }

        const container = new ContainerBuilder();
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${client.config.emojis.ping} **Recent Mentions**`));

        container.addSeparatorComponents(
            new SeparatorBuilder()
                .setSpacing(SeparatorSpacingSize.Small)
                .setDivider(true)
        );

        const mentionsList = userData.lastPings.map((ping, index) => {
            const time = Math.floor(ping.timestamp.getTime() / 1000);
            return `**${index + 1}.** By <@${ping.authorId}> in <#${ping.channelId}> — <t:${time}:R>\n` +
                `> ${ping.content.length > 100 ? ping.content.substring(0, 97) + '...' : ping.content}`;
        }).reverse().join('\n\n');

        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(mentionsList));

        if (isSlash) {
            await interaction.reply({ components: [container], flags: KyraUI.getFlags(), allowedMentions: { parse: [] } });
        } else {
            await message.reply({ components: [container], flags: KyraUI.getFlags(), allowedMentions: { parse: [] } });
        }
    }
};
