import { Guild } from '#src/database/index.js';
import { logger } from '#src/utils/logger.js';
import { PermissionFlagsBits } from 'discord.js';

export default {
    name: 'guildMemberAdd',
    async execute(member, client) {
        if (member.user.bot) return;

        let guildData;
        try {
            guildData = await Guild.findById(member.guild.id);
        } catch (error) {
            return logger.error('GUILD_MEMBER_ADD', `Failed to fetch guild settings for ${member.guild.name}`, error);
        }

        if (!guildData) return;

        try {
            // --- Autorole System ---
            if (guildData.autoroles && guildData.autoroles.length > 0) {
                const me = member.guild.members.me || await member.guild.members.fetchMe().catch(() => null);
                if (me && me.permissions.has(PermissionFlagsBits.ManageRoles)) {
                    const rolesToAdd = guildData.autoroles.filter(roleId => {
                        const role = member.guild.roles.cache.get(roleId);
                        return role && role.position < me.roles.highest.position;
                    });

                    if (rolesToAdd.length > 0) {
                        await member.roles.add(rolesToAdd, 'Automatic role assignment on join');
                        logger.info('AUTOROLE', `Assigned ${rolesToAdd.length} roles to ${member.user.tag} in ${member.guild.name}.`);
                    }
                }
            }

            // --- Greet System ---
            if (guildData.greet?.enabled && guildData.greet?.channelId) {
                const channel = member.guild.channels.cache.get(guildData.greet.channelId);
                if (channel) {
                    const { KyraUI } = await import('#classes/KyraUI');
                    const msg = KyraUI.buildFixedWelcome(member.user, member.guild);
                    channel.send(msg).catch((err) => logger.error('GREET', 'Failed to send greet message', err));
                }
            }

            // --- Quick Greet System ---
            if (guildData.quickGreet?.channels?.length > 0) {
                for (const channelId of guildData.quickGreet.channels) {
                    const channel = member.guild.channels.cache.get(channelId);
                    if (channel) {
                        channel.send({ content: `<@${member.id}>` }).then(msg => {
                            setTimeout(() => msg.delete().catch(() => { }), 5000);
                        }).catch(() => { });
                    }
                }
            }

        } catch (error) {
            logger.error('GUILD_MEMBER_ADD', `Error processing join systems for ${member.user.tag}`, error);
        }
    }
};
