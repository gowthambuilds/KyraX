import { ApplicationCommandOptionType, PermissionFlagsBits, ChannelType } from 'discord.js';
import { TicketUI } from '#classes/TicketUI';

export default {
    name: 'setverifychannel',
    description: 'Set the channel where users post screenshots for verification',
    options: [
        {
            name: 'channel',
            description: 'The channel for verification (defaults to current)',
            type: ApplicationCommandOptionType.Channel,
            channel_types: [ChannelType.GuildText],
            required: false
        }
    ],
    async execute({ client, message, interaction, args }) {
        const isSlash = !!interaction;
        const guild = isSlash ? interaction.guild : message.guild;
        const member = isSlash ? interaction.member : message.member;

        const channel = isSlash
            ? interaction.options.getChannel('channel') || interaction.channel
            : message.mentions.channels.first() || message.channel;

        if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            const msg = 'You need Manage Server permissions to use this command.';
            return isSlash ? interaction.reply({ components: TicketUI.buildSimpleMessage(msg), flags: TicketUI.getFlags(true) }) : message.reply(msg);
        }

        if (channel.type !== ChannelType.GuildText) {
            const msg = 'Verification channel must be a text channel.';
            return isSlash ? interaction.reply({ components: TicketUI.buildSimpleMessage(msg), flags: TicketUI.getFlags(true) }) : message.reply(msg);
        }

        const settings = await client.db.getSettings(guild.id);
        settings.verificationChannelId = channel.id;
        await client.db.saveSettings(guild.id, settings);

        const msg = `${client.config.emojis.check} **Verification Channel Set!**\nUsers should post screenshots in <#${channel.id}>.`;
        if (isSlash) {
            await interaction.reply({ components: TicketUI.buildSimpleMessage(msg), flags: TicketUI.getFlags(true) });
        } else {
            await message.reply(msg);
        }
    }
};
