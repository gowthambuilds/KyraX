import { KyraUI } from '#classes/KyraUI';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MediaGalleryBuilder, MediaGalleryItemBuilder } from 'discord.js';

export default {
    name: 'serverbanner',
    description: "Displays the server's banner",
    aliases: ['svb', 'sbanner'],
    slash: true,
    async execute({ client, message, interaction }) {
        const isSlash = !!interaction;
        const { guild } = isSlash ? interaction : message;

        const bannerURL = guild.bannerURL({ size: 4096 });

        if (!bannerURL) {
            const errorContainer = KyraUI.buildSimpleMessage("This server doesn't have a banner!");
            const errorData = { components: errorContainer, flags: KyraUI.getFlags(true) };
            return isSlash ? interaction.reply(errorData) : message.reply(errorData).then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000)).catch(() => { });
        }

        const container = KyraUI.buildDashboard(
            `### 🖼️ **${guild.name}'s Banner**`,
            `${client.config.emojis.dot} *Displaying the high-resolution server banner.*`
        );

        const gallery = new MediaGalleryBuilder()
            .addItems(new MediaGalleryItemBuilder().setURL(bannerURL));

        container[0].addMediaGalleryComponents(gallery);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Download Banner')
                .setURL(bannerURL)
                .setStyle(ButtonStyle.Link)
        );

        container[0].addActionRowComponents(row);

        const responseData = {
            components: container,
            flags: KyraUI.getFlags()
        };

        if (isSlash) {
            await interaction.reply(responseData);
        } else {
            await message.reply(responseData).catch(() => { });
        }
    }
};
