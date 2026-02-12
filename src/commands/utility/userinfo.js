import { KyraUI } from '#classes/KyraUI';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, ThumbnailBuilder, SectionBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize } from 'discord.js';

export default {
    name: 'userinfo',
    description: 'Displays information about a user',
    aliases: ['ui', 'whois'],
    slash: true,
    options: [
        { name: 'user', description: 'The user to view information for', type: 6, required: false }
    ],
    async execute({ client, message, interaction, args }) {
        const isSlash = !!interaction;
        const target = isSlash
            ? interaction.options.getMember('user') || interaction.member
            : message.mentions.members.first() || (args?.[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : message.member);

        if (!target) return;

        const { user } = target;
        const joinedAt = Math.floor(target.joinedTimestamp / 1000);
        const createdAt = Math.floor(user.createdTimestamp / 1000);
        const roles = target.roles.cache
            .filter(r => r.id !== target.guild.id)
            .sort((a, b) => b.position - a.position)
            .map(r => r.toString())
            .slice(0, 5);

        const roleDisplay = roles.length > 0 ? roles.join(' ') : '*No roles*';
        const moreRoles = target.roles.cache.size - 1 > 5 ? ` *+ ${target.roles.cache.size - 1 - 5} more*` : '';

        const description = `${client.config.emojis.dot} **Username:** ${user.username}\n` +
            `${client.config.emojis.dot} **ID:** \`${user.id}\`\n` +
            `${client.config.emojis.dot} **Created:** <t:${createdAt}:R>\n` +
            `${client.config.emojis.dot} **Joined:** <t:${joinedAt}:R>\n\n` +
            `**Roles [${target.roles.cache.size - 1}]**\n${roleDisplay}${moreRoles}`;

        const container = new ContainerBuilder();
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 👤 **User Information**`));
        container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

        const section = new SectionBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(description))
            .setThumbnailAccessory(new ThumbnailBuilder().setURL(user.displayAvatarURL({ dynamic: true, size: 1024 })));

        container.addSectionComponents(section);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Avatar URL')
                .setURL(user.displayAvatarURL({ dynamic: true, size: 1024 }))
                .setStyle(ButtonStyle.Link)
        );

        container.addActionRowComponents(row);

        const responseData = {
            components: [container],
            flags: KyraUI.getFlags()
        };

        if (isSlash) {
            await interaction.reply(responseData);
        } else {
            await message.reply(responseData);
        }
    }
};
