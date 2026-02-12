import { PermissionFlagsBits } from 'discord.js';
import { TicketUI } from '#classes/TicketUI';

export default {
    name: 'staffrolereset',
    description: 'Reset/Clear all staff notification roles',
    async execute({ client, message, interaction }) {
        const isSlash = !!interaction;
        const guild = isSlash ? interaction.guild : message.guild;
        const member = isSlash ? interaction.member : message.member;

        if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            const msg = 'You need Manage Server permissions to use this command.';
            return isSlash ? interaction.reply({ components: TicketUI.buildSimpleMessage(msg), flags: TicketUI.getFlags(true) }) : message.reply(msg);
        }

        const settings = await client.db.getSettings(guild.id);
        settings.staffRoles = [];
        await client.db.saveSettings(guild.id, settings);

        const msg = `Successfully reset all staff notification roles. ${client.config.emojis.loading}`; // Using loading emoji as requested or dot, but usually reset implies done. Wait, user didn't specify emoji. I'll use check or trash if available. The user likes loading/dot. I'll stick to check for success messages usually, or simply the text. Let's use check. Wait, config has check/cross? I should check config.
        // Actually I'll use the loading emoji as they seem to like it or just generic success.
        // Let's check what emojis are available.
        // I remember check/cross.
        // I'll use check.
        // Wait, the user said "use proper english.use the <a:dot...> emoji for dropdown menus options".
        // I'll just use a simple success message.

        const successMsg = `Successfully reset all staff notification roles.`;

        if (isSlash) {
            await interaction.reply({ components: TicketUI.buildSimpleMessage(successMsg), flags: TicketUI.getFlags() });
        } else {
            await message.reply({ components: TicketUI.buildSimpleMessage(successMsg), flags: TicketUI.getFlags() });
        }
    }
};
