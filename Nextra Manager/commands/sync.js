import { PermissionFlagsBits } from 'discord.js';
import { TicketUI } from '#classes/TicketUI';


export default {
    name: 'sync',
    description: 'Manually sync slash commands with Discord',
    async execute({ client, message, interaction }) {
        const isSlash = !!interaction;
        const user = isSlash ? interaction.user : message.author;

        if (!client.config.bot.ownerIds.includes(user.id)) {
            const msg = 'Only bot owners can use this command.';
            return isSlash ? interaction.reply({ components: TicketUI.buildSimpleMessage(msg), flags: TicketUI.getFlags(true) }) : message.reply(msg);
        }



        const feedback = isSlash ? await interaction.reply({ components: TicketUI.buildSimpleMessage(`${client.config.emojis.loading} **Syncing...**`), fetchReply: true, flags: TicketUI.getFlags() }) : await message.reply(`${client.config.emojis.loading} **Syncing...**`);



        try {
            const slashData = client.commands
                .map(cmd => ({
                    name: cmd.name,
                    description: cmd.description || 'No description',
                    options: cmd.options || []
                }));

            await client.application.commands.set(slashData);
            const success = 'Successfully synced slash commands globally.';
            isSlash ? await interaction.editReply({ components: TicketUI.buildSimpleMessage(success), flags: TicketUI.getFlags() }) : await feedback.edit(success);
        } catch (error) {
            client.logger.error('Client', 'Manual sync failed', error);
            const fail = 'Failed to sync commands. Check console for details.';
            isSlash ? await interaction.editReply({ components: TicketUI.buildSimpleMessage(fail), flags: TicketUI.getFlags() }) : await feedback.edit(fail);
        }


    }
};
