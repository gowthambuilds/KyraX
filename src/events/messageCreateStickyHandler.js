import { Events } from 'discord.js';
import { Guild } from '#src/database/index.js';
import { KyraUI } from '#classes/KyraUI';

export default {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (message.author.bot) return;
        if (!message.guild) return;

        // Fetch guild settings
        const guildSettings = await Guild.findById(message.guild.id);
        if (!guildSettings || !guildSettings.stickyData || !guildSettings.stickyData.has(message.channel.id)) return;

        const sticky = guildSettings.stickyData.get(message.channel.id);
        if (!sticky || !sticky.content) return;

        // Prevent recursion if somehow triggered by own message (though author.bot check should catch it)
        if (sticky.lastMessageId === message.id) return;

        try {
            // Delete old sticky if it exists
            if (sticky.lastMessageId) {
                try {
                    const oldMsg = await message.channel.messages.fetch(sticky.lastMessageId).catch(() => null);
                    if (oldMsg) await oldMsg.delete().catch(() => { });
                } catch (err) {
                    // Ignore fetch/delete errors
                }
            }

            // Send new sticky as plain text
            const newMsg = await message.channel.send({
                content: sticky.content
            }).catch(() => null);

            if (newMsg) {
                // Update the lastMessageId in the Map
                sticky.lastMessageId = newMsg.id;
                guildSettings.stickyData.set(message.channel.id, sticky);
                guildSettings.markModified('stickyData');
                await guildSettings.save().catch(err => {
                    client.logger.error('StickyHandler', `Failed to save sticky message ID for ${message.channel.id}`, err);
                });
            }
        } catch (error) {
            client.logger.error('StickyHandler', `Failed to handle sticky in ${message.channel.id}`, error);
        }
    }
};

