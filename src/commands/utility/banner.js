import { KyraUI } from '#classes/KyraUI';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MediaGalleryBuilder, MediaGalleryItemBuilder } from 'discord.js';

export default {
    name: 'banner',
    description: 'Displays the profile banner of a user',
    aliases: ['ub', 'userbanner'],
    slash: true,
    options: [
        { name: 'user', description: 'The user to view banner for', type: 6, required: false }
    ],
    async execute({ client, message, interaction, args }) {
        const isSlash = !!interaction;
        const target = isSlash
            ? interaction.options.getMember('user') || interaction.member
            : message.mentions.members.first() || (args?.[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : message.member);

        if (!target) return;

        const user = await target.user.fetch();
        const bannerURL = user.bannerURL({ dynamic: true, size: 4096 });

        if (!bannerURL) {
            const errorContainer = KyraUI.buildSimpleMessage(`**${user.username}** does not have a profile banner.`);
            const errorData = {
                components: errorContainer,
                flags: KyraUI.getFlags(true)
            };
            return isSlash ? interaction.reply(errorData) : message.reply(errorData);
        }

        const container = KyraUI.buildDashboard(
            `### 🖼️ **User Banner**`,
            `${client.config.emojis.dot} **User:** ${user.toString()}\n${client.config.emojis.dot} **ID:** \`${user.id}\``
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
            await message.reply(responseData);
        }
    }
};
