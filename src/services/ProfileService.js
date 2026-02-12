import { Guild } from '#src/database/index.js';
import { logger } from '#utils/logger';

async function imageUrlToBase64(url) {
    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const contentType = response.headers.get('content-type');
        return `data:${contentType};base64,${buffer.toString('base64')}`;
    } catch (error) {
        logger.error('PROFILE', `Failed to convert image to base64: ${url}`, error);
        return null;
    }
}

class ProfileService {
    /**
     * Applies the customized profile for a guild to the bot member.
     * @param {Client} client The discord client
     * @param {string} guildId The guild ID
     */
    async applyProfile(client, guildId) {
        try {
            const guild = await client.guilds.fetch(guildId).catch(() => null);
            if (!guild) return;

            const guildData = await Guild.findById(guildId).lean();
            if (!guildData || !guildData.profile?.customized) return;

            const me = guild.members.me || await guild.members.fetch(client.user.id).catch(() => null);
            if (!me) return;

            const { avatar, nickname, banner } = guildData.profile;

            // Apply Nickname
            if (nickname !== undefined && me.nickname !== nickname) {
                await me.setNickname(nickname, 'Per-server bot profile').catch(err => {
                    logger.error('PROFILE', `Failed to set nickname in ${guild.name}`, err);
                });
            }

            // Apply Avatar & Banner (Requires API calls to edit guild member)
            // Discord API: PATCH /guilds/{guild.id}/members/@me
            if (avatar || banner) {
                const data = {};
                if (avatar) data.avatar = await imageUrlToBase64(avatar);
                if (banner) data.banner = await imageUrlToBase64(banner);

                if (Object.keys(data).length > 0) {
                    await client.rest.patch(`/guilds/${guildId}/members/@me`, { body: data }).catch(err => {
                        if (err.message?.includes('AVATAR_RATE_LIMIT')) {
                            logger.warn('PROFILE', `Rate limited for avatar/banner in ${guild.name}.`);
                        } else {
                            logger.error('PROFILE', `Failed to set avatar/banner via REST in ${guild.name}`, err);
                        }
                        throw err; // Re-throw so command can catch
                    });
                }
            }
        } catch (error) {
            logger.error('PROFILE', `Failed to apply profile for guild ${guildId}`, error);
        }
    }

    /**
     * Resets the bot's profile for a guild and updates the database.
     * @param {Client} client The discord client
     * @param {string} guildId The guild ID
     */
    async resetProfile(client, guildId) {
        try {
            const guild = await client.guilds.fetch(guildId).catch(() => null);
            if (!guild) return;

            const me = guild.members.me || await guild.members.fetch(client.user.id).catch(() => null);
            if (me) {
                await me.setNickname(null, 'Resetting per-server profile').catch(() => { });

                // Reset avatar and banner via REST
                await client.rest.patch(`/guilds/${guildId}/members/@me`, {
                    body: { avatar: null, banner: null }
                }).catch(() => { });
            }

            await Guild.findOneAndUpdate(
                { _id: guildId },
                {
                    $set: {
                        'profile.customized': false,
                        'profile.avatar': null,
                        'profile.nickname': null,
                        'profile.banner': null,
                        'profile.lastUpdated': new Date()
                    }
                }
            );

            logger.info('PROFILE', `Reset profile for guild: ${guild.name} (${guildId})`);
        } catch (error) {
            logger.error('PROFILE', `Failed to reset profile for guild ${guildId}`, error);
        }
    }
}

export const profileService = new ProfileService();
