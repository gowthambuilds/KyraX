import { KyraUI } from '#classes/KyraUI';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MediaGalleryBuilder, MediaGalleryItemBuilder } from 'discord.js';

export default {
    name: 'servericon',
    description: "Displays the server's icon",
    aliases: ['sicon', 'guildicon'],
    slash: true,
    async execute({ client, message, interaction }) {
        const isSlash = !!interaction;
        const { guild } = isSlash ? interaction : message;

        const iconURL = guild.iconURL({ dynamic: true, size: 4096 });

        if (!iconURL) {
            const errorContainer = KyraUI.buildSimpleMessage("This server doesn't have an icon!");
            const errorData = { components: errorContainer, flags: KyraUI.getFlags(true) };
            return isSlash ? interaction.reply(errorData) : message.reply(errorData).then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000)).catch(() => { });
        }

        const container = KyraUI.buildDashboard(
            `### 🖼️ **${guild.name}'s Icon**`,
            `${client.config.emojis.dot} *Displaying the high-resolution server icon.*`
        );

        const gallery = new MediaGalleryBuilder()
            .addItems(new MediaGalleryItemBuilder().setURL(iconURL));

        container[0].addMediaGalleryComponents(gallery);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Download Icon')
                .setURL(iconURL)
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
