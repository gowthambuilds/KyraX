import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ChannelType } from 'discord.js';
import { Guild } from '#src/database/index.js';
import { KyraUI } from '#classes/KyraUI';

export const StatManager = {
    async updateAll(client) {
        const guilds = await Guild.find({ 'serverStats.enabled': true });

        for (const guildData of guilds) {
            const discordGuild = await client.guilds.fetch(guildData._id).catch(() => null);
            if (!discordGuild) continue;

            await this.updateGuild(client, discordGuild, guildData);
        }
    },

    async updateGuild(client, guild, guildData) {
        if (!guildData?.serverStats?.enabled || !guildData.serverStats.channelId || !guildData.serverStats.messageId) return;

        const { channelId, messageId, statsHistory } = guildData.serverStats;
        const channel = await guild.channels.fetch(channelId).catch(() => null);
        if (!channel) return;

        const message = await channel.messages.fetch(messageId).catch(() => null);
        if (!message) {
            // If message is deleted, disable server stats to prevent errors
            await Guild.findOneAndUpdate({ _id: guild.id }, { 'serverStats.enabled': false });
            return;
        }

        // Fetch all members for accuracy
        let allMembers;
        try {
            allMembers = await guild.members.fetch();
        } catch (e) {
            allMembers = guild.members.cache;
        }

        const totalMembers = guild.memberCount;
        const members = allMembers.filter(m => !m.user.bot).size;
        const bots = allMembers.filter(m => m.user.bot).size;

        // Presence check
        const onlineStatus = ['online', 'dnd', 'idle'];
        const online = allMembers.filter(m => m.presence && onlineStatus.includes(m.presence.status)).size;

        // Channel Counts
        const channels = await guild.channels.fetch();
        const textChannels = channels.filter(c => c.type === ChannelType.GuildText).size;
        const voiceChannels = channels.filter(c => c.type === ChannelType.GuildVoice).size;
        const stageChannels = channels.filter(c => c.type === ChannelType.GuildStageVoice).size;
        const categories = channels.filter(c => c.type === ChannelType.GuildCategory).size;

        // Date Logic
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        const getDateStr = (daysAgo) => {
            const d = new Date();
            d.setDate(d.getDate() - daysAgo);
            return d.toISOString().split('T')[0];
        };

        const yesterdayStr = getDateStr(1);
        const lastWeekStr = getDateStr(7);
        const lastMonthStr = getDateStr(30);

        const findEntry = (date) => statsHistory.find(h => h.date === date);
        const findClosestEntry = (date) => {
            const filtered = statsHistory.filter(h => h.date <= date).sort((a, b) => b.date.localeCompare(a.date));
            return filtered[0];
        };

        const todayEntry = findEntry(todayStr);
        const yesterdayEntry = findEntry(yesterdayStr);
        const weekEntry = findClosestEntry(lastWeekStr);
        const monthEntry = findClosestEntry(lastMonthStr);

        if (!todayEntry) {
            await Guild.findOneAndUpdate(
                { _id: guild.id },
                { $push: { 'serverStats.statsHistory': { date: todayStr, count: totalMembers } } }
            );
        }

        const joinsToday = todayEntry ? totalMembers - todayEntry.count : 0;
        const joinsYesterday = (yesterdayEntry && todayEntry) ? todayEntry.count - yesterdayEntry.count : 0;
        const joinsWeek = weekEntry ? totalMembers - weekEntry.count : joinsToday;
        const joinsMonth = monthEntry ? totalMembers - monthEntry.count : joinsWeek;

        const growthPercent = todayEntry && todayEntry.count > 0
            ? ((totalMembers - todayEntry.count) / todayEntry.count * 100).toFixed(2)
            : "0.00";

        const fields = [
            { name: `👥 **User Population**`, value: `${client.config.emojis.dot} Total: \`${totalMembers.toLocaleString()}\`\n${client.config.emojis.dot} Humans: \`${members.toLocaleString()}\`\n${client.config.emojis.dot} Bots: \`${bots.toLocaleString()}\`\n${client.config.emojis.dot} Online: \`${online.toLocaleString()}\`` },
            { name: `📊 **Trends & Growth**`, value: `${client.config.emojis.dot} Today: \`+${joinsToday}\`\n${client.config.emojis.dot} Yesterday: \`+${joinsYesterday}\`\n${client.config.emojis.dot} Last 7 Days: \`+${joinsWeek}\`\n${client.config.emojis.dot} Last 30 Days: \`+${joinsMonth}\` \n${client.config.emojis.dot} Rate: \`${growthPercent}%\`` },
            { name: `📂 **Server Structure**`, value: `${client.config.emojis.dot} Categories: \`${categories}\`\n${client.config.emojis.dot} Text: \`${textChannels}\`\n${client.config.emojis.dot} Voice: \`${voiceChannels}\`\n${client.config.emojis.dot} Stage: \`${stageChannels}\`` },
            { name: `💎 **Guild Assets**`, value: `${client.config.emojis.dot} Roles: \`${guild.roles.cache.size}\`\n${client.config.emojis.dot} Emojis: \`${guild.emojis.cache.size}\`\n${client.config.emojis.dot} Boosts: \`${guild.premiumSubscriptionCount}\` (Lvl ${guild.premiumTier})` }
        ];

        const container = KyraUI.buildDetailedDashboard(
            `📈 **${guild.name} Statistics**`,
            `Last updated: <t:${Math.floor(Date.now() / 1000)}:R>`,
            fields
        );

        await message.edit({ components: container }).catch(() => { });

        if (statsHistory.length > 90) {
            await Guild.findOneAndUpdate(
                { _id: guild.id },
                { $pop: { 'serverStats.statsHistory': -1 } }
            );
        }
    }
};
