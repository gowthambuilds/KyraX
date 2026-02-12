import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { KyraUI } from '#classes/KyraUI';

export default {
    name: 'support',
    description: 'Get the link to the Kyra X support server.',
    aliases: ['supportserver'],
    slash: true,
    async execute({ client, message, interaction }) {
        const isSlash = !!interaction;

        const container = KyraUI.buildDashboard(
            `### 🪐 **Kyra X Support**`,
            `Need help or want to join the community?\n\n` +
            `${client.config.emojis.dot} **Support Server:** [Click here to join](${client.config.bot.supportServer})\n` +
            `${client.config.emojis.dot} **Developer:** <@${client.config.ownerId}>\n` +
            `${client.config.emojis.dot} **Website:** [nextraforge.xyz](${client.config.bot.website})\n\n` +
            `*Part of NextraForge ecosystem. Growing elite standards.*`
        );

        // Add a primary button for easier access
        container[0].addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('Join Support Server')
                    .setURL(client.config.bot.supportServer)
                    .setStyle(ButtonStyle.Link)
            )
        );

        const responseData = { components: container, flags: KyraUI.getFlags() };
        return isSlash ? interaction.reply(responseData) : message.reply(responseData);
    }
};
