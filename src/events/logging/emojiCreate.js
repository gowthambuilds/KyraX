import { Events, AuditLogEvent } from 'discord.js';
import { EventLogger } from '#utils/eventLogger';

export default {
    name: Events.GuildEmojiCreate,
    async execute(emoji, client) {
        const { guild } = emoji;
        const executor = await EventLogger.getExecutor(guild, AuditLogEvent.EmojiCreate);

        await EventLogger.log(client, guild, 'emoji', {
            title: '😆 Emoji Added',
            description: `A new emoji has been added: ${emoji}`,
            fields: [
                { name: 'Name', value: `\`${emoji.name}\``, inline: true },
                { name: 'Created By', value: executor ? `<@${executor.id}>` : 'Unknown', inline: true }
            ]
        });
    }
};
