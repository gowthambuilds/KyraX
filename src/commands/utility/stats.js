import { KyraUI } from '#classes/KyraUI';
import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, version as djsVersion } from 'discord.js';
import os from 'os';

export default {
    name: 'stats',
    description: 'Displays technical statistics of the bot',
    aliases: ['botstats', 'status', 'info'],
    slash: true,
    async execute({ client, message, interaction }) {
        const isSlash = !!interaction;

        // Collect stats
        const uptime = formatUptime(client.uptime);
        const guildsCount = client.guilds.cache.size;
        const usersCount = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);

        // Technical stats
        const ramUsage = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
        const totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
        const nodeVersion = process.version;
        const osPlatform = os.type();
        const osRelease = os.release();

        // Music Statistics
        const musicPlayers = client.lavalink?.kazagumo?.players.size || 0;
        const songsPlaying = Array.from(client.lavalink?.kazagumo?.players.values() || [])
            .reduce((acc, p) => acc + (p.queue.length + (p.playing ? 1 : 0)), 0);

        const container = new ContainerBuilder();

        // Title Header
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## 📊 **Bot Statistics**`)
        );

        // Visual Divider
        container.addSeparatorComponents(
            new SeparatorBuilder()
                .setSpacing(SeparatorSpacingSize.Small)
                .setDivider(true)
        );

        // Stats Content
        const statsContent =
            `### Bot Information\n` +
            `• **Bot Owner:** <@${process.env.OWNER_ID}>\n` +
            `• **Developed By:** [Nextraforge](${client.config.bot.supportServer})\n` +
            `• **Uptime:** \`${uptime}\`\n\n` +

            `### Performance & Limits\n` +
            `• **RAM Usage:** \`${ramUsage} MB\` / \`${totalRam} GB\`\n` +
            `• **Library:** \`discord.js v${djsVersion}\`\n` +
            `• **Environment:** \`Node.js ${nodeVersion}\`\n\n` +

            `### Global Statistics\n` +
            `• **Servers:** \`${guildsCount}\`\n` +
            `• **Users:** \`${usersCount}\`\n` +
            `• **Live Players:** \`${musicPlayers}\`\n` +
            `• **Songs Played:** \`${client.musicStats.totalSongsPlayed}\`\n` +
            `• **Platform:** \`${osPlatform} (${osRelease})\``;

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(statsContent)
        );

        const responseData = {
            components: [container],
            flags: KyraUI.getFlags(),
            allowedMentions: { parse: [] }
        };

        if (isSlash) {
            await interaction.reply(responseData);
        } else {
            await message.reply(responseData);
        }
    }
};

/**
 * Format uptime milliseconds into a human-readable string
 * @param {number} ms 
 * @returns {string}
 */
function formatUptime(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);

    return parts.join(' ');
}
