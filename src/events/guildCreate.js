import { Events } from 'discord.js';
import { KyraUI } from '#classes/KyraUI';
import { Guild } from '#src/database/index.js';
import { profileService } from '#src/services/ProfileService.js';
import { premiumService } from '#src/services/PremiumService.js';

export default {
    name: Events.GuildCreate,
    async execute(guild, client) {
        const logChannelId = client.config.bot.logs?.guilds;
        if (!logChannelId) return;

        const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
        if (!logChannel) return;

        const owner = await guild.fetchOwner().catch(() => null);
        const memberCount = guild.memberCount;
        const totalGuilds = client.guilds.cache.size;

        const title = `### 📥 **Joined Server**`;
        const description =
            `${client.config.emojis.dot} **Name:** \`${guild.name}\`\n` +
            `${client.config.emojis.dot} **ID:** \`${guild.id}\`\n` +
            `${client.config.emojis.dot} **Owner:** ${owner ? `<@${owner.id}> (\`${owner.id}\`)` : '`Unknown`'}\n` +
            `${client.config.emojis.dot} **Members:** \`${memberCount.toLocaleString()}\`\n` +
            `${client.config.emojis.dot} **Total Servers:** \`${totalGuilds.toLocaleString()}\``;

        const container = KyraUI.buildDashboard(title, description);

        await logChannel.send({
            components: container,
            flags: KyraUI.getFlags(),
            allowedMentions: { parse: [] }
        }).catch(() => { });

        client.logger.info('GUILD', `Joined: ${guild.name} (${guild.id}) | Total: ${totalGuilds}`);

        // Initialize Guild in database
        await Guild.findOneAndUpdate(
            { _id: guild.id },
            { $setOnInsert: { prefix: client.config.bot.prefix } },
            { upsert: true, new: true }
        );

        // Apply bot profile if customization exists and guild is premium
        const guildData = await Guild.findById(guild.id).lean();
        if (guildData?.profile?.customized && premiumService.isGuildPremium(guild.id)) {
            await profileService.applyProfile(client, guild.id).catch(() => { });
        }
    }
};
