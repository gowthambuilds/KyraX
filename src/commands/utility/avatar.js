import { KyraUI } from '#classes/KyraUI';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MediaGalleryBuilder, MediaGalleryItemBuilder } from 'discord.js';

export default {
    name: 'avatar',
    description: "Displays a user's avatar",
    aliases: ['av', 'pfp'],
    slash: true,
    options: [
        { name: 'user', description: 'The user to view avatar for', type: 6, required: false }
    ],
    async execute({ client, message, interaction, args }) {
        const isSlash = !!interaction;
        const target = isSlash
            ? interaction.options.getUser('user') || interaction.user
            : message.mentions.users.first() || (args?.[0] ? await client.users.fetch(args[0]).catch(() => null) : message.author);

        if (!target) return;

        const avatarURL = target.displayAvatarURL({ dynamic: true, size: 4096 });

        const container = KyraUI.buildDashboard(
            `### 🖼️ **${target.username}'s Avatar**`,
            `${client.config.emojis.dot} *Displaying the high-resolution profile picture.*`
        );

        const gallery = new MediaGalleryBuilder()
            .addItems(new MediaGalleryItemBuilder().setURL(avatarURL));

        container[0].addMediaGalleryComponents(gallery);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Download Avatar')
                .setURL(avatarURL)
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
            await message.reply(responseData);
        }
    }
};
