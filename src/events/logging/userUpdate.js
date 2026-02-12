import { Events } from 'discord.js';
import { EventLogger } from '#utils/eventLogger';

export default {
    name: Events.UserUpdate,
    async execute(oldUser, newUser, client) {
        // 1. Username Change
        if (oldUser.username !== newUser.username) {
            // Find all mutual guilds to log
            for (const guild of client.guilds.cache.values()) {
                if (guild.members.cache.has(newUser.id)) {
                    await EventLogger.log(client, guild, 'member', {
                        title: '👤 Identity Updated',
                        description: `**${oldUser.tag}** changed their username.`,
                        color: '#5865F2',
                        fields: [
                            { name: 'User', value: `<@${newUser.id}>`, inline: true },
                            { name: 'Changes', value: EventLogger.formatDiff(oldUser.username, newUser.username) }
                        ],
                        thumbnail: newUser.displayAvatarURL({ dynamic: true })
                    });
                }
            }
        }

        // 2. Avatar Change
        if (oldUser.avatar !== newUser.avatar) {
            for (const guild of client.guilds.cache.values()) {
                if (guild.members.cache.has(newUser.id)) {
                    await EventLogger.log(client, guild, 'member', {
                        title: '🖼️ Avatar Updated',
                        description: `**${newUser.tag}** updated their profile picture.`,
                        color: '#5865F2',
                        fields: [
                            { name: 'User', value: `<@${newUser.id}>`, inline: true }
                        ],
                        image: newUser.displayAvatarURL({ dynamic: true, size: 1024 }),
                        thumbnail: oldUser.displayAvatarURL({ dynamic: true })
                    });
                }
            }
        }
    }
};
