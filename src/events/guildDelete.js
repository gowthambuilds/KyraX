import { Events } from 'discord.js';
import { KyraUI } from '#classes/KyraUI';

export default {
    name: Events.GuildDelete,
    async execute(guild, client) {
        const logChannelId = client.config.bot.logs?.guilds;
        if (!logChannelId) return;

        const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
        if (!logChannel) return;

        const memberCount = guild.memberCount;
        const totalGuilds = client.guilds.cache.size;

        const title = `### 📤 **Left Server**`;
        const description =
            `${client.config.emojis.dot} **Name:** \`${guild.name || 'Unknown'}\`\n` +
            `${client.config.emojis.dot} **ID:** \`${guild.id}\`\n` +
            `${client.config.emojis.dot} **Members:** \`${memberCount.toLocaleString()}\`\n` +
            `${client.config.emojis.dot} **Total Servers:** \`${totalGuilds.toLocaleString()}\``;

        const container = KyraUI.buildDashboard(title, description);

        await logChannel.send({
            components: container,
            flags: KyraUI.getFlags()
        }).catch(() => { });

        client.logger.info('GUILD', `Left: ${guild.name} (${guild.id}) | Total: ${totalGuilds}`);
    }
};
