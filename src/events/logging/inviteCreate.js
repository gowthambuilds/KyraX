import { Events } from 'discord.js';
import { EventLogger } from '#utils/eventLogger';

export default {
    name: Events.InviteCreate,
    async execute(invite, client) {
        const { guild } = invite;

        // Update cache
        const guildInvites = client.invites.get(guild.id) || new Map();
        guildInvites.set(invite.code, invite.uses);
        client.invites.set(guild.id, guildInvites);

        const title = `🎫 Invite Created`;
        const description = `A new invite has been created for <#${invite.channelId}>.`;

        const fields = [
            { name: 'Code', value: `\`${invite.code}\``, inline: true },
            { name: 'Inviter', value: invite.inviter ? `<@${invite.inviterId}> (\`${invite.inviter.tag}\`)` : 'System', inline: true },
            { name: 'Max Uses', value: invite.maxUses === 0 ? 'Unlimited' : `${invite.maxUses}`, inline: true },
            { name: 'Expires', value: invite.expiresAt ? `<t:${Math.floor(invite.expiresTimestamp / 1000)}:R>` : 'Never', inline: true }
        ];

        await EventLogger.log(client, guild, 'invite', {
            title,
            description,
            color: '#43B581',
            fields
        });
    }
};
