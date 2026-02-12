import { ApplicationCommandOptionType, PermissionFlagsBits } from 'discord.js';
import { TicketUI } from '#classes/TicketUI';
import { validateChannel, getChannelInfo } from '#utils/youtubeAPI';

export default {
    name: 'setytchannel',
    description: 'Set the YouTube channel for verification',
    options: [
        {
            name: 'channel',
            description: 'YouTube Channel ID, URL, or @handle',
            type: ApplicationCommandOptionType.String,
            required: true
        }
    ],
    async execute({ client, message, interaction, args }) {
        const isSlash = !!interaction;
        const guild = isSlash ? interaction.guild : message.guild;
        const member = isSlash ? interaction.member : message.member;
        let input = isSlash ? interaction.options.getString('channel') : args[0];

        if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            const msg = 'You need Manage Server permissions to use this command.';
            return isSlash ? interaction.reply({ components: TicketUI.buildSimpleMessage(msg), flags: TicketUI.getFlags(true) }) : message.reply(msg);
        }

        if (!input) {
            const msg = 'Please provide a YouTube channel ID, URL, or @handle.';
            return isSlash ? interaction.reply({ components: TicketUI.buildSimpleMessage(msg), flags: TicketUI.getFlags(true) }) : message.reply(msg);
        }

        // Logic for extracting potential identifier from URL/Handle
        let identifier = input;
        if (input.includes('youtube.com') || input.includes('youtu.be') || input.includes('@')) {
            // Check for handle first
            const handleMatch = input.match(/(@[^\/\?]+)/);
            if (handleMatch) {
                identifier = handleMatch[1];
            } else if (input.includes('/channel/')) {
                const idMatch = input.match(/\/channel\/([^\/\?]+)/);
                if (idMatch) identifier = idMatch[1];
            } else if (input.includes('/user/') || input.includes('/c/')) {
                const userMatch = input.match(/\/(?:user|c)\/([^\/\?]+)/);
                if (userMatch) identifier = userMatch[1];
            }
        }

        const loadingMsg = `${client.config.emojis.loading} **Validating YouTube Channel...**`;
        let response;
        if (isSlash) {
            await interaction.reply({ components: TicketUI.buildSimpleMessage(loadingMsg), flags: TicketUI.getFlags(true) });
        } else {
            response = await message.reply(loadingMsg);
        }

        try {
            const isValid = await validateChannel(identifier);
            if (!isValid) {
                const errorMsg = `${client.config.emojis.cross} Invalid YouTube channel. Please check the ID/URL/Handle and try again.`;
                if (isSlash) {
                    await interaction.editReply({ components: TicketUI.buildSimpleMessage(errorMsg) });
                } else {
                    await response.edit(errorMsg);
                }
                return;
            }

            const channelInfo = await getChannelInfo(identifier);
            const settings = await client.db.getSettings(guild.id);
            settings.youtubeChannelId = channelInfo.id; // Store the actual UC... ID
            settings.youtubeChannelName = channelInfo.title;
            await client.db.saveSettings(guild.id, settings);

            const successMsg = `${client.config.emojis.check} **YouTube Channel Set!**\nTarget: **${channelInfo.title}** (${channelInfo.id})`;
            if (isSlash) {
                await interaction.editReply({ components: TicketUI.buildSimpleMessage(successMsg) });
            } else {
                await response.edit(successMsg);
            }
        } catch (error) {
            client.logger.error('YT_SET', 'Failed to set YT channel', error);
            const errorMsg = `${client.config.emojis.cross} An error occurred while validating the channel.`;
            if (isSlash) {
                await interaction.editReply({ components: TicketUI.buildSimpleMessage(errorMsg) });
            } else {
                await response.edit(errorMsg);
            }
        }
    }
};
