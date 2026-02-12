import { Events } from 'discord.js';
import { EventLogger } from '#utils/eventLogger';

export default {
    name: Events.InviteDelete,
    async execute(invite, client) {
        const { guild } = invite;

        // Update cache
        const guildInvites = client.invites.get(guild.id);
        if (guildInvites) {
            guildInvites.delete(invite.code);
        }

        const title = `🗑️ Invite Deleted`;
        const description = `An invite has been deleted.`;

        const fields = [
            { name: 'Code', value: `\`${invite.code}\``, inline: true },
            { name: 'Channel', value: `<#${invite.channelId}>`, inline: true }
        ];

        await EventLogger.log(client, guild, 'invite', {
            title,
            description,
            color: '#F04747',
            fields
        });
    }
};
