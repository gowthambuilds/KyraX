import { PermissionFlagsBits } from 'discord.js';
import { KyraUI } from '#classes/KyraUI';
import { Giveaway } from '#src/database/index.js';

export default {
    name: 'gend',
    description: 'Manually end a giveaway',
    aliases: ['gend', 'giveaway-end'],
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

        const data = await Giveaway.findById(messageId);
        if (!data) {
            const errorMsg = `${client.config.emojis.error} I couldn't find a giveaway with that message ID.`;
            if (isSlash) return interaction.reply({ content: errorMsg, flags: KyraUI.getFlags(true) });
            return message.reply({ content: errorMsg }).then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000)).catch(() => { });
        }

        if (data.ended) {
            const errorMsg = `${client.config.emojis.error} This giveaway has already ended.`;
            if (isSlash) return interaction.reply({ content: errorMsg, flags: KyraUI.getFlags(true) });
            return message.reply({ content: errorMsg }).then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000)).catch(() => { });
        }

        await client.giveaways.end(messageId);

        const successMsg = `${client.config.emojis.success} Giveaway **${data.prize}** ended successfully!`;
        if (isSlash) return interaction.reply({ content: successMsg, flags: KyraUI.getFlags(true) });
        return message.reply({ content: successMsg }).then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000)).catch(() => { });
    }
};
