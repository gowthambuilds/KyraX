import { Events, PresenceUpdateStatus, ActivityType } from 'discord.js';
import { presenceConfig } from '#config/presence';
import { StatManager } from '#utils/StatManager';

export default {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        client.logger.success('AUTH', `Synchronized with ${client.user.tag}`);

        // Cache application owner
        client.application.fetch().catch(() => null);

        let currentIndex = 0;

        const updatePresence = () => {
            const activity = presenceConfig.activities[currentIndex];
            let text = activity.text;

            if (text.includes('{users}')) {
                const totalUsers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
                text = text.replace('{users}', totalUsers.toLocaleString());
            }

            if (text.includes('{guilds}')) {
                text = text.replace('{guilds}', client.guilds.cache.size.toLocaleString());
            }

            client.user.setPresence({
                activities: [{
                    name: text,
                    type: activity.type,
                    ...(activity.type === ActivityType.Custom ? { state: text } : {})
                }],
                status: PresenceUpdateStatus.Online
            });

            currentIndex = (currentIndex + 1) % presenceConfig.activities.length;
        };

        // Initial update
        updatePresence();

        // Start interval
        setInterval(updatePresence, presenceConfig.interval);

        // Resume pending timers
        resumeTimers(client);

        // Initialize Premium System
        const { premiumService } = await import('#src/services/PremiumService.js');
        await premiumService.init(client);

        // Cache invites
        cacheInvites(client);

        // Initial Stat Update
        await StatManager.updateAll(client).catch(() => { });

        // Set Interval for Stats (5 minutes)
        setInterval(async () => {
            await StatManager.updateAll(client).catch(() => { });
        }, 5 * 60 * 1000);

        // Cleanup expired giveaways (15 days)
        cleanupExpiredGiveaways(client);
    }
};

async function cacheInvites(client) {
    client.logger.info('INVITE', 'Caching invites for all guilds...');
    for (const guild of client.guilds.cache.values()) {
        try {
            const invites = await guild.invites.fetch().catch(() => null);
            if (!invites) continue;

            const guildInvites = new Map();
            invites.forEach(inv => guildInvites.set(inv.code, inv.uses));
            client.invites.set(guild.id, guildInvites);
        } catch (e) {
            // Probably missing Manage Server permission
        }
    }
    client.logger.success('INVITE', `Cached invites for ${client.invites.size} guilds.`);
}

async function resumeTimers(client) {
    try {
        const { Timer } = await import('#src/database/index.js');
        const { KyraUI } = await import('#classes/KyraUI');

        // Find all uncompleted timers
        const pendingTimers = await Timer.find({ completed: false });

        if (pendingTimers.length === 0) return;

        client.logger.info('TIMER', `Resuming ${pendingTimers.length} pending timer(s)...`);

        for (const timer of pendingTimers) {
            const now = Date.now();
            const expiresAt = new Date(timer.expiresAt).getTime();
            const timeLeft = expiresAt - now;

            // Get channel and user
            const channel = await client.channels.fetch(timer.channelId).catch(() => null);
            if (!channel) {
                // Channel doesn't exist anymore, mark as completed
                await Timer.updateOne({ _id: timer._id }, { completed: true });
                continue;
            }

            const user = await client.users.fetch(timer.userId).catch(() => null);
            if (!user) {
                // User doesn't exist anymore, mark as completed
                await Timer.updateOne({ _id: timer._id }, { completed: true });
                continue;
            }

            if (timeLeft <= 0) {
                // Timer already expired, trigger immediately
                await Timer.updateOne({ _id: timer._id }, { completed: true });
                await handleExpiration(client, timer, true);
            } else {
                // Timer still pending, schedule it
                setTimeout(async () => {
                    await Timer.updateOne({ _id: timer._id }, { completed: true });
                    await handleExpiration(client, timer, false);
                }, timeLeft);
            }
        }

        client.logger.success('TIMER', `Successfully resumed ${pendingTimers.length} timer(s).`);
    } catch (error) {
        client.logger.error('TIMER', `Failed to resume timers: ${error.message}`);
    }
}

async function handleExpiration(client, timer, wasOffline) {
    const channel = await client.channels.fetch(timer.channelId).catch(() => null);
    const user = await client.users.fetch(timer.userId).catch(() => null);

    if (timer.type === 'TIMEOUT' || timer.type === 'TEMPBAN') {
        const guild = await client.guilds.fetch(timer.guildId).catch(() => null);
        if (!guild) return;

        if (timer.type === 'TIMEOUT') {
            // Notify in channel
            if (channel) {
                const expireMsg = `${client.config.emojis.success} **Timeout Expired:** <@${timer.userId}> is no longer timed out.`;
                await channel.send({ content: expireMsg }).catch(() => { });
            }

            // Notify via DM
            if (user) {
                const { KyraUI } = await import('#classes/KyraUI');
                const dmContainer = KyraUI.buildDashboard(
                    `### 🛡️ **Timeout Expired**`,
                    `Your timeout in **${guild.name}** has expired.\n\n` +
                    `${client.config.emojis.dot} You can now send messages and participate again.`
                );
                await user.send({ components: dmContainer, flags: KyraUI.getFlags() }).catch(() => { });
            }
        } else if (timer.type === 'TEMPBAN') {
            // Unban the user
            await guild.members.unban(timer.userId, 'Temporary ban expired').catch(() => null);

            // Notify in channel
            if (channel) {
                const expireMsg = `${client.config.emojis.success} **Tempban Expired:** <@${timer.userId}> has been unbanned.`;
                await channel.send({ content: expireMsg }).catch(() => { });
            }

            // Notify via DM
            if (user) {
                const { KyraUI } = await import('#classes/KyraUI');
                const dmContainer = KyraUI.buildDashboard(
                    `### 🛡️ **Ban Expired**`,
                    `Your temporary ban in **${guild.name}** has expired.\n\n` +
                    `${client.config.emojis.dot} You have been unbanned and can rejoin the server.`
                );
                await user.send({ components: dmContainer, flags: KyraUI.getFlags() }).catch(() => { });
            }
        }
    } else {
        // Standard TIMER logic
        if (channel && user) {
            const alertContent = `${client.config.emojis.success} **Timer Up!** <@${user.id}>, your timer has finished${wasOffline ? ' (while bot was offline)' : ''}.`;
            await channel.send({ content: alertContent }).catch(() => { });
        }
    }
}

async function cleanupExpiredGiveaways(client) {
    try {
        const { Giveaway, GiveawayEntry } = await import('#src/database/index.js');

        // Calculate cutoff date (15 days ago)
        const fifteenDaysAgo = new Date(Date.now() - (15 * 24 * 60 * 60 * 1000));

        // Find expired giveaways older than 15 days
        const expiredGiveaways = await Giveaway.find({
            ended: true,
            endTimestamp: { $lt: fifteenDaysAgo }
        });

        if (expiredGiveaways.length === 0) {
            client.logger.info('GIVEAWAY', 'No expired giveaways to clean up.');
            return;
        }

        // Extract giveaway IDs
        const giveawayIds = expiredGiveaways.map(g => g._id);

        // Delete giveaway entries first (foreign key constraint)
        const entriesResult = await GiveawayEntry.deleteMany({
            giveawayId: { $in: giveawayIds }
        });

        // Delete the giveaways
        const giveawaysResult = await Giveaway.deleteMany({
            _id: { $in: giveawayIds }
        });

        client.logger.success(
            'GIVEAWAY',
            `Cleaned up ${giveawaysResult.deletedCount} expired giveaway(s) and ${entriesResult.deletedCount} entries older than 15 days.`
        );
    } catch (error) {
        client.logger.error('GIVEAWAY', `Failed to cleanup expired giveaways: ${error.message}`);
    }
}
