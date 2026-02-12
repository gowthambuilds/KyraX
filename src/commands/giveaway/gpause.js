import { PermissionFlagsBits } from 'discord.js';
import { KyraUI } from '#classes/KyraUI';

export default {
    name: 'gpause',
    description: 'Pause an active giveaway',
    aliases: ['pause'],
    slash: true,
    userPermissions: [PermissionFlagsBits.ManageGuild],
    options: [
        { name: 'message_id', description: 'The ID of the giveaway message', type: 3, required: true }
    ],
    async execute({ client, message, interaction, args }) {
        const isSlash = !!interaction;
        const messageId = isSlash ? interaction.options.getString('message_id') : args[0];

        if (!messageId) {
            const errorMsg = `${client.config.emojis.error} Please provide the ID of the giveaway message.`;
            if (isSlash) return interaction.reply({ content: errorMsg, flags: KyraUI.getFlags(true) });
            return message.reply({ content: errorMsg }).then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000)).catch(() => { });
        }

        const success = await client.giveaways.pause(messageId);

        if (success) {
            const successMsg = `${client.config.emojis.success} Giveaway paused successfully!`;
            if (isSlash) return interaction.reply({ content: successMsg, flags: KyraUI.getFlags(true) });
            return message.reply({ content: successMsg }).then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000)).catch(() => { });
        } else {
            const errorMsg = `${client.config.emojis.error} Failed to pause giveaway. Ensure the ID is correct and it's not already ended or paused.`;
            if (isSlash) return interaction.reply({ content: errorMsg, flags: KyraUI.getFlags(true) });
            return message.reply({ content: errorMsg }).then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000)).catch(() => { });
        }
    }
};
