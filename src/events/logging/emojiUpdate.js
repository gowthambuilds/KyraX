import { Events, AuditLogEvent } from 'discord.js';
import { EventLogger } from '#utils/eventLogger';

export default {
    name: Events.GuildEmojiUpdate,
    async execute(oldEmoji, newEmoji, client) {
        const { guild } = newEmoji;

        if (oldEmoji.name !== newEmoji.name) {
            const executor = await EventLogger.getExecutor(guild, AuditLogEvent.EmojiUpdate);
            await EventLogger.log(client, guild, 'emoji', {
                title: '😆 Emoji Renamed',
                description: `An emoji has been renamed: ${newEmoji}`,
                fields: [
                    { name: 'Changes', value: EventLogger.formatDiff(oldEmoji.name, newEmoji.name) },
                    { name: 'Updated By', value: executor ? `<@${executor.id}>` : 'Unknown' }
                ]
            });
        }
    }
};
