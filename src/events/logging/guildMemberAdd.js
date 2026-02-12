import { Events, PermissionFlagsBits } from 'discord.js';
import { EventLogger } from '#utils/eventLogger';

export default {
    name: Events.GuildMemberAdd,
    async execute(member, client) {
        const { guild } = member;

        // 1. Gateway Logs: Member Join
        const joinTitle = `📥 Member Joined`;
        const joinDesc = `**${member.user.tag}** joined the server.`;

        const joinFields = [
            { name: 'User', value: `<@${member.id}> (\`${member.id}\`)`, inline: true },
            { name: 'Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }
        ];

        // 2. Invite Tracking
        let inviteInfo = 'Unknown / Vanity URL';
        try {
            const oldInvites = client.invites.get(guild.id);
            const newInvites = await guild.invites.fetch().catch(() => null);

            if (newInvites && oldInvites) {
                const usedItem = newInvites.find(inv => inv.uses > (oldInvites.get(inv.code) || 0));

                if (usedItem) {
                    inviteInfo = `Code: **${usedItem.code}**\nInviter: <@${usedItem.inviterId}> (\`${usedItem.inviter.tag}\`)\nUses: **${usedItem.uses}**`;

                    // Update cache
                    const updatedMap = new Map();
                    newInvites.forEach(inv => updatedMap.set(inv.code, inv.uses));
                    client.invites.set(guild.id, updatedMap);
                } else if (guild.vanityURLCode) {
                    // Check if vanity was used (though D.js doesn't easily track vanity uses change)
                    inviteInfo = `Vanity URL (**${guild.vanityURLCode}**)`;
                }
            } else if (newInvites) {
                // Initial fill if not cached
                const updatedMap = new Map();
                newInvites.forEach(inv => updatedMap.set(inv.code, inv.uses));
                client.invites.set(guild.id, updatedMap);
            }
        } catch (e) { }

        joinFields.push({ name: 'Invite Details', value: inviteInfo });

        await EventLogger.log(client, guild, 'gateway', {
            title: joinTitle,
            description: joinDesc,
            color: '#43B581',
            fields: joinFields,
            thumbnail: member.user.displayAvatarURL({ dynamic: true })
        });
    }
};
