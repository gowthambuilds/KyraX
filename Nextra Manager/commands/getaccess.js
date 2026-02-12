import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize } from 'discord.js';
import { TicketUI } from '#classes/TicketUI';


export default {
    name: 'getaccess',
    description: 'Instructions on how to get access to free codes and bots',
    async execute({ client, message, interaction }) {
        const isSlash = !!interaction;
        const guild = isSlash ? interaction.guild : message.guild;

        const settings = await client.db.getSettings(guild.id);
        const verifyChannelId = settings.verificationChannelId;
        const targetUrl = 'https://www.youtube.com/@nextraforgestudios';

        const container = new ContainerBuilder();

        const channelMention = verifyChannelId ? `<#${verifyChannelId}>` : 'the designated verification channel';

        const dot = client.config.emojis.dot || '•';
        const check = client.config.emojis.check || '✅';

        const content = `## ${client.config.emojis.ticket || '🚀'} Get Exclusive Access!
Unlock our **Premium Bot & Web Source Codes** by following these simple steps:

${dot} **Step 1: Subscribe**
Visit our YouTube channel and hit the subscribe button:
[Nextra Forge Studios](${targetUrl})

${dot} **Step 2: Take a Screenshot**
Capture a clear screenshot showing that you have subscribed to the channel.

${dot} **Step 3: Submit for Verification**
Post the screenshot in ${channelMention}. Our system will automatically verify your subscription.

### 💎 What you get:
${check} **Subscriber Role** - Exclusive access to restricted channels.
${check} **Free Source Codes** - Get high-quality bot and website codes.
${check} **Direct Support** - Priority assistance in our support server.
${check} **Updates** - Stay updated with our latest releases and features.

*Verification is usually instant but can take a few minutes. If you face any issues, contact our staff!*`;

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(content)
        );

        container.addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Subscribe Here')
                .setURL(targetUrl)
                .setStyle(ButtonStyle.Link),
            new ButtonBuilder()
                .setLabel('Support Server')
                .setURL(client.config.bot.supportServer)
                .setStyle(ButtonStyle.Link)
        );

        container.addActionRowComponents(row);

        const responseData = { components: [container], flags: TicketUI.getFlags() };

        if (isSlash) {
            await interaction.reply(responseData);
        } else {
            await message.reply(responseData);
        }
    }
};
