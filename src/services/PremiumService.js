import { PremiumUser, PremiumGuild, PremiumToken } from '#src/database/index.js';
import { profileService } from './ProfileService.js';
import { logger } from '#utils/logger';
import { KyraUI } from '#classes/KyraUI';
import ms from 'ms';

class PremiumService {
    constructor() {
        this.users = new Map(); // userId -> { endAt, ... }
        this.guilds = new Map(); // guildId -> { endAt, ... }
        this.client = null;
    }

    /**
     * Initialize the service, loads data into cache and starts expiration loop.
     */
    async init(client) {
        this.client = client;
        try {
            const [users, guilds] = await Promise.all([
                PremiumUser.find({ isPremium: true }),
                PremiumGuild.find({ isPremium: true })
            ]);

            users.forEach(u => this.users.set(u.userId, {
                userId: u.userId,
                expiry: u.endAt ? new Date(u.endAt).getTime() : null,
                startAt: u.startAt
            }));
            guilds.forEach(g => this.guilds.set(g.guildId, {
                guildId: g.guildId,
                expiry: g.endAt ? new Date(g.endAt).getTime() : null,
                startAt: g.startAt
            }));

            logger.info('PREMIUM', `Loaded ${this.users.size} Users and ${this.guilds.size} Guilds into memory.`);

            // Start expiry checker every minute
            setInterval(() => this.checkExpiry(), 60000);

            // Initial check on startup
            this.checkExpiry();
        } catch (error) {
            logger.error('PREMIUM', 'Initialization failed', error);
        }
    }

    /**
     * Checks if a user has active premium (Global).
     */
    isUserPremium(userId) {
        if (!userId) return false;
        const user = this.users.get(userId);
        const now = Date.now();
        return !!(user && (user.expiry === null || user.expiry > now));
    }

    /**
     * Checks if a guild has active premium (Server-wide).
     */
    isGuildPremium(guildId) {
        if (!guildId) return false;
        const guild = this.guilds.get(guildId);
        const now = Date.now();
        return !!(guild && (guild.expiry === null || guild.expiry > now));
    }

    /**
     * Checks if either user or guild has active premium.
     * @deprecated Use isUserPremium or isGuildPremium for specific checks.
     */
    isPremium(userId, guildId) {
        return this.isUserPremium(userId) || this.isGuildPremium(guildId);
    }

    /**
     * Generic duration parser supporting s, m, h, d, w, mo, y, life.
     */
    parseDuration(input) {
        if (input === 'life' || input === 'lifetime') return null;

        // Handle 'mo' and 'y' which standard 'ms' might not handle perfectly
        const match = input.match(/^(\d+)(s|m|h|d|w|mo|y)$/);
        if (!match) return null;

        const val = parseInt(match[1]);
        const unit = match[2];

        switch (unit) {
            case 's': return val * 1000;
            case 'm': return val * 60000;
            case 'h': return val * 3600000;
            case 'd': return val * 86400000;
            case 'w': return val * 604800000;
            case 'mo': return val * 2592000000; // 30 days
            case 'y': return val * 31536000000; // 365 days
            default: return null;
        }
    }

    /**
     * Interval check to expire premiums.
     */
    async checkExpiry() {
        const now = Date.now();

        // Check Users
        for (const [userId, data] of this.users.entries()) {
            if (data.expiry && data.expiry <= now) {
                await this.removePremium(userId, 'user', true);
            }
        }

        // Check Guilds
        for (const [guildId, data] of this.guilds.entries()) {
            if (data.expiry && data.expiry <= now) {
                await this.removePremium(guildId, 'guild', true);
            }
        }
    }

    /**
     * Activates premium.
     */
    async addPremium(id, durationStr, type, tokenCode = null, executorId = null) {
        const durationMs = this.parseDuration(durationStr);
        const startAt = new Date();
        const endAt = durationMs ? new Date(startAt.getTime() + durationMs) : null;

        if (type === 'user') {
            const data = await PremiumUser.findOneAndUpdate(
                { userId: id },
                { isPremium: true, startAt, endAt },
                { upsert: true, new: true }
            );
            this.users.set(id, {
                userId: id,
                expiry: endAt ? endAt.getTime() : null,
                startAt: startAt
            });
            await this.notify(id, 'user', true, data, false, tokenCode, executorId);
        } else {
            const data = await PremiumGuild.findOneAndUpdate(
                { guildId: id },
                { isPremium: true, startAt, endAt, type: 'guild' },
                { upsert: true, new: true }
            );
            this.guilds.set(id, {
                guildId: id,
                expiry: endAt ? endAt.getTime() : null,
                startAt: startAt
            });
            await this.notify(id, 'guild', true, data, false, tokenCode, executorId);
        }
    }

    /**
     * Redeems a premium token for a guild.
     * @param {string} guildId 
     * @param {string} tokenCode 
     * @param {string} userId
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async redeemToken(guildId, tokenCode, userId) {
        const token = await PremiumToken.findOne({ code: tokenCode });

        if (!token) {
            return { success: false, message: 'Invalid token code.' };
        }

        if (token.remainingUses <= 0) {
            return { success: false, message: 'This token has reached its maximum usage limit.' };
        }

        if (token.claimedBy.includes(guildId)) {
            return { success: false, message: 'This guild has already claimed this token.' };
        }

        // Activate premium for the guild
        await this.addPremium(guildId, token.duration, 'guild', tokenCode, userId);

        // Update token usage and history
        token.remainingUses -= 1;
        token.claimedBy.push(guildId);
        token.claims.push({
            guildId,
            userId,
            at: new Date()
        });
        await token.save();

        return { success: true, message: `Successfully activated premium for this guild! (${token.duration === 'life' ? 'Lifetime' : token.duration})` };
    }


    /**
     * Removes premium.
     */
    async removePremium(id, type, isExpiry = false, executorId = null) {
        if (type === 'user') {
            const data = await PremiumUser.findOne({ userId: id });
            await PremiumUser.deleteOne({ userId: id });
            this.users.delete(id);
            if (data) await this.notify(id, 'user', false, data, isExpiry, null, executorId);
        } else {
            const data = await PremiumGuild.findOne({ guildId: id });
            await PremiumGuild.deleteOne({ guildId: id });
            this.guilds.delete(id);

            // Reset per-server profile on premium expiry
            await profileService.resetProfile(this.client, id).catch(() => { });

            if (data) await this.notify(id, 'guild', false, data, isExpiry, null, executorId);
        }
    }

    /**
     * Handles DM and Log notifications.
     * @param {string} id - User or Guild ID.
     * @param {'user'|'guild'} type - Type of premium (user or guild).
     * @param {boolean} isActivation - True if premium is activated, false otherwise.
     * @param {object} data - Premium data from database.
     * @param {boolean} [isExpiry=false] - True if premium expired naturally.
     * @param {string|null} [tokenCode=null] - Optional token code if activated via token.
     * @param {string|null} [executorId=null] - ID of the user who triggered the action.
     */
    async notify(id, type, isActivation, data, isExpiry = false, tokenCode = null, executorId = null) {
        if (!this.client) return;

        try {
            let target;
            let embedContent = '';
            const title = isActivation ? '✨ Premium Activated' : (isExpiry ? '⌛ Premium Expired' : '🚫 Premium Removed');
            const color = isActivation ? '#FCD005' : '#FF0000';

            if (type === 'user') {
                target = await this.client.users.fetch(id).catch(() => null);
                if (!target) return;

                embedContent = isActivation
                    ? `Greetings! Your **Global Premium** has been activated.\n\n` +
                    `📅 **Starts:** <t:${Math.floor(data.startAt.getTime() / 1000)}:f>\n` +
                    `⌛ **Expires:** ${data.endAt ? `<t:${Math.floor(data.endAt.getTime() / 1000)}:R>` : '`Lifetime`'}\n\n` +
                    `You can now use commands without the prefix in any server!`
                    : `Your **Global Premium** has ${isExpiry ? 'expired' : 'been removed'}.\n` +
                    `Thank you for supporting **Kyra X**!`;
            } else {
                const guild = await this.client.guilds.fetch(id).catch(() => null);
                if (!guild) return;
                target = await this.client.users.fetch(guild.ownerId).catch(() => null);
                if (!target) return;

                embedContent = isActivation
                    ? `Greetings! **${guild.name}** has been upgraded to **Kyra X Premium**.\n\n` +
                    `📅 **Starts:** <t:${Math.floor(data.startAt.getTime() / 1000)}:f>\n` +
                    `⌛ **Expires:** ${data.endAt ? `<t:${Math.floor(data.endAt.getTime() / 1000)}:R>` : '`Lifetime`'}\n\n` +
                    `You can now enjoy all elite features!`
                    : `**${guild.name}**'s premium status has ${isExpiry ? 'expired' : 'been removed'}.\n` +
                    `Upgrade again to keep using elite features!`;
            }

            // DM Notification
            if (target) {
                const container = KyraUI.buildSimpleMessage(`### ${title}\n${embedContent}`);
                await target.send({ components: container, flags: KyraUI.getFlags() }).catch(() => { });
            }

            // Log notification
            const logChannelId = this.client.config.bot.logs.premium;
            if (logChannelId) {
                const logChannel = await this.client.channels.fetch(logChannelId).catch(() => null);
                if (logChannel) {
                    const logType = isActivation ? 'Activated' : (isExpiry ? 'Expired' : 'Removed');
                    const statusEmoji = isActivation ? this.client.config.emojis.success : this.client.config.emojis.error;
                    const statusText = isActivation ? 'Success' : (isExpiry ? 'Graceful End' : 'Manually Removed');

                    let sourceInfo = '';
                    if (tokenCode) {
                        const token = await PremiumToken.findOne({ code: tokenCode });
                        sourceInfo = `${this.client.config.emojis.dot} **Source:** Token (\`${tokenCode}\`)\n` +
                            `${this.client.config.emojis.dot} **Token Uses:** \`${token?.totalUses - token?.remainingUses}/${token?.totalUses}\``;
                    } else if (executorId) {
                        sourceInfo = `${this.client.config.emojis.dot} **Granted By:** <@${executorId}> (\`${executorId}\`)`;
                    } else if (isExpiry) {
                        sourceInfo = `${this.client.config.emojis.dot} **Source:** Automated System (Expiration)`;
                    } else {
                        sourceInfo = `${this.client.config.emojis.dot} **Source:** Global Management System`;
                    }

                    const logContainer = KyraUI.buildDashboard(
                        `### ${this.client.config.emojis.premium} **Premium Log: ${logType}**`,
                        `${this.client.config.emojis.dot} **Target:** \`${type.toUpperCase()}\` | \`${id}\`\n` +
                        `${this.client.config.emojis.dot} **Status:** ${statusEmoji} \`${statusText}\`\n` +
                        `${this.client.config.emojis.dot} **Period:** <t:${Math.floor(data.startAt.getTime() / 1000)}:f> **→** ${data.endAt ? `<t:${Math.floor(data.endAt.getTime() / 1000)}:f>` : '`Lifetime`'}\n` +
                        sourceInfo +
                        `\n*Processed via Global Management System*`
                    );
                    await logChannel.send({ components: logContainer, flags: KyraUI.getFlags() });
                }
            }
        } catch (error) {
            console.error('[PremiumService] Error sending notification:', error);
        }
    }
}

export const premiumService = new PremiumService();
