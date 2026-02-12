import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { KyraUI } from '#classes/KyraUI';
import { Pagination } from '#utils/Pagination';

export default {
    name: 'serverlist',
    description: 'Displays a list of all servers the bot is in.',
    aliases: ['slist'],
    ownerOnly: true,
    async execute({ client, message, prefix }) {
        if (!client.config.ownerId.includes(message.author.id)) {
            return message.channel.send({
                content: `${client.config.emojis.error} You are not authorized to use this command.`,
                flags: KyraUI.getFlags()
            });
        }

        const guilds = client.guilds.cache.map(g => `**${g.name}** (\`${g.id}\`) - ${g.memberCount} members`);

        if (guilds.length === 0) {
            return message.channel.send('I am not in any servers.');
        }

        await Pagination.create({
            client,
            message,
            title: 'Bot Server List',
            items: guilds,
            itemsPerPage: 10
        });
    }
};
