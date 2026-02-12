import { KyraUI } from '#classes/KyraUI';
import { Guild } from '#src/database/index.js';
import { PermissionFlagsBits } from 'discord.js';

export default {
    name: 'prefix',
    description: "Displays or changes the bot's prefix for this server",
    slash: true,
    options: [
        { name: 'set', description: 'Set a new prefix', type: 3, required: false }
    ],
    async execute({ client, message, interaction, args }) {
        const isSlash = !!interaction;
        const guildId = isSlash ? interaction.guild.id : message.guild.id;
        const executor = isSlash ? interaction.member : message.member;

        const guildSettings = await Guild.findById(guildId);
        const currentPrefix = guildSettings?.prefix || client.config.bot.prefix;
        const newPrefix = isSlash ? interaction.options.getString('set') : args[0];

        if (!newPrefix) {
            const container = KyraUI.buildDashboard(
                `### ⚙️ **Server Prefix**`,
                `The current prefix for this server is \`${currentPrefix}\`.\n\n` +
                `${client.config.emojis.dot} *You can also use slash commands (/).*`
            );
            const responseData = { components: container, flags: KyraUI.getFlags() };
            return isSlash ? interaction.reply(responseData) : message.reply(responseData);
        }

        // Check permissions to change prefix
        if (!executor.permissions.has(PermissionFlagsBits.ManageGuild)) {
            const errorData = { content: 'You need `Manage Server` permission to change the prefix.', flags: KyraUI.getFlags(true) };
            return isSlash ? interaction.reply(errorData) : message.reply(errorData).then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000)).catch(() => { });
        }

        if (newPrefix.length > 5) {
            const errorData = { content: 'The prefix must be 5 characters or less.', flags: KyraUI.getFlags(true) };
            return isSlash ? interaction.reply(errorData) : message.reply(errorData).then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000)).catch(() => { });
        }

        await Guild.findOneAndUpdate(
            { _id: guildId },
            { prefix: newPrefix },
            { upsert: true }
        );

        const container = KyraUI.buildDashboard(
            `### ${client.config.emojis.success} **Prefix Updated**`,
            `The prefix for this server has been successfully updated.\n\n` +
            `${client.config.emojis.dot} **New Prefix:** \`${newPrefix}\``
        );

        const responseData = { components: container, flags: KyraUI.getFlags() };
        if (isSlash) {
            await interaction.reply(responseData);
        } else {
            await message.reply(responseData).catch(() => { });
        }
    }
};
