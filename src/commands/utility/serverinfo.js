import { KyraUI } from '#classes/KyraUI';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, SectionBuilder, ThumbnailBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize } from 'discord.js';
import { premiumService } from '#src/services/PremiumService.js';

export default {
    name: 'serverinfo',
    description: 'Displays detailed information about the server',
    aliases: ['si', 'guildinfo'],
    slash: true,
    async execute({ client, message, interaction }) {
        const isSlash = !!interaction;
        const { guild } = isSlash ? interaction : message;

        const owner = await guild.fetchOwner();
        const isPremium = premiumService.isGuildPremium(guild.id);

        // Channel Breakdown
        const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
        const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
        const categories = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;
        const stageChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildStageVoice).size;

        // Member Breakdown
        const totalMembers = guild.memberCount;
        const botCount = guild.members.cache.filter(m => m.user.bot).size;
        const humanCount = totalMembers - botCount;

        const createdAt = Math.floor(guild.createdTimestamp / 1000);

        const description = `**General**\n` +
            `${client.config.emojis.dot} **ID:** \`${guild.id}\`\n` +
            `${client.config.emojis.dot} **Owner:** ${owner.user.username}\n` +
            `${client.config.emojis.dot} **Created:** <t:${createdAt}:D> (<t:${createdAt}:R>)\n` +
            `${client.config.emojis.dot} **Kyra Premium:** ${isPremium ? `${client.config.emojis.premium || '✨'} Active` : 'Inactive'}\n` +
            `${client.config.emojis.dot} **Boosts:** ${guild.premiumSubscriptionCount || 0} (Level ${guild.premiumTier})\n` +
            `${client.config.emojis.dot} **Verification:** ${guild.verificationLevel}\n` +
            `${client.config.emojis.dot} **Filters:** ${guild.explicitContentFilter}\n\n` +
            `**Statistics**\n` +
            `${client.config.emojis.dot} **Members:** ${totalMembers.toLocaleString()} (Humans: ${humanCount} | Bots: ${botCount})\n` +
            `${client.config.emojis.dot} **Channels:** ${textChannels + voiceChannels + stageChannels} (T: ${textChannels} | V: ${voiceChannels} | S: ${stageChannels})\n` +
            `${client.config.emojis.dot} **Roles:** ${guild.roles.cache.size} ${client.config.emojis.dot} **Emojis:** ${guild.emojis.cache.size}\n` +
            `${client.config.emojis.dot} **Stickers:** ${guild.stickers.cache.size}`;

        const container = new ContainerBuilder();
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🏢 **${guild.name}**`));
        container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

        const section = new SectionBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(description))
            .setThumbnailAccessory(new ThumbnailBuilder().setURL(guild.iconURL({ dynamic: true, size: 1024 }) || 'https://cdn.discordapp.com/embed/avatars/0.png'));

        container.addSectionComponents(section);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Server Icon')
                .setURL(guild.iconURL({ dynamic: true, size: 1024 }) || 'https://discord.com')
                .setStyle(ButtonStyle.Link)
                .setDisabled(!guild.icon),
            new ButtonBuilder()
                .setLabel('Banner')
                .setURL(guild.bannerURL({ size: 1024 }) || 'https://discord.com')
                .setStyle(ButtonStyle.Link)
                .setDisabled(!guild.banner)
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
