import { Events } from 'discord.js';
import { EventLogger } from '#utils/eventLogger';

export default {
    name: Events.MessageUpdate,
    async execute(oldMessage, newMessage, client) {
        if (oldMessage.partial) return;
        if (newMessage.author?.bot) return;
        if (oldMessage.content === newMessage.content) return;

        const { guild, channel } = newMessage;
        if (!guild) return;

        const title = `📝 Message Edited`;
        const description = `A message by **${newMessage.author.tag}** was edited in <#${channel.id}>. [(Jump to Message)](${newMessage.url})`;

        const fields = [
            { name: 'Author', value: `<@${newMessage.author.id}> (\`${newMessage.author.id}\`)`, inline: true },
            { name: 'Channel', value: `<#${channel.id}>`, inline: true },
            { name: 'Changes', value: EventLogger.formatDiff(oldMessage.content.substring(0, 512), newMessage.content.substring(0, 512)) }
        ];

        await EventLogger.log(client, guild, 'message', {
            title,
            description,
            color: '#FAA61A',
            fields
        });
    }
};
