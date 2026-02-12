import { Events, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { KyraUI } from '#classes/KyraUI';
import { Guild } from '#src/database/index.js';

export default {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (message.author.bot || !message.guild) return;

        // Check if the message content is JUST the bot mention or starts with it
        const mentionRegex = new RegExp(`^<@!?${client.user.id}>(?:\\s+)?$`);

        if (mentionRegex.test(message.content)) {
            const guildSettings = await Guild.findById(message.guild.id);
            const prefix = guildSettings?.prefix || client.config.bot.prefix;

            const content = `Hello there! I'm ${client.config.bot.name} ${client.config.emojis.dot}\nMy prefix for this server is \`${prefix}\` (or you can just mention me!). *You can use* \`${prefix}help\` *to see what I can do for you.*\n\n${client.config.emojis.dot} Modern UI ${client.config.emojis.dot} *Fast Response* ${client.config.emojis.dot} Reliable`;

            const container = KyraUI.buildDashboard(
                `### ${client.config.emojis.greeting} **${client.config.bot.name}**`,
                content
            );

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('Get Started')
                    .setCustomId(`help_button:${message.author.id}`) // Encode author ID
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setLabel('Support')
                    .setURL(client.config.bot.supportServer)
                    .setStyle(ButtonStyle.Link)
            );

            container[0].addActionRowComponents(row);

            return message.reply({
                components: container,
                flags: KyraUI.getFlags()
            });
        }
    }
};
