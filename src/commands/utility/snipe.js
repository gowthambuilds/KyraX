import { KyraUI } from '#classes/KyraUI';
import { MediaGalleryBuilder, MediaGalleryItemBuilder } from 'discord.js';

export default {
    name: 'snipe',
    description: 'Retrieves the last deleted message in the channel',
    slash: true,
    async execute({ client, message, interaction }) {
        const isSlash = !!interaction;
        const channelId = isSlash ? interaction.channel.id : message.channel.id;

        const snipe = client.snipes.get(channelId);

        if (!snipe) {
            const errorContainer = KyraUI.buildSimpleMessage("There's nothing to snipe in this channel!");
            const errorData = { components: errorContainer, flags: KyraUI.getFlags(true) };
            return isSlash ? interaction.reply(errorData) : message.reply(errorData).then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000)).catch(() => { });
        }

        const createdAt = Math.floor(snipe.timestamp / 1000);
        const description = `${client.config.emojis.dot} **Author:** ${snipe.author.tag}\n` +
            `${client.config.emojis.dot} **Deleted:** <t:${createdAt}:R>\n\n` +
            `**Content:**\n${snipe.content || '*No text content*'}`;

        const container = KyraUI.buildDashboard(
            `### 🎯 **Snipe Found**`,
            description
        );

        if (snipe.attachments.length > 0) {
            const imageAttachments = snipe.attachments.filter(a => a.contentType?.startsWith('image/'));
            if (imageAttachments.length > 0) {
                const gallery = new MediaGalleryBuilder()
                    .addItems(new MediaGalleryItemBuilder().setURL(imageAttachments[0].url));
                container[0].addMediaGalleryComponents(gallery);
            }
        }

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
