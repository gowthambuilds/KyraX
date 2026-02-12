import { KyraUI } from '#classes/KyraUI';

export default {
    name: 'users',
    description: 'Shows the total number of users and guilds the bot is in.',
    aliases: ['botstats', 'status'],
    slash: true,
    async execute({ client, message, interaction }) {
        const isSlash = !!interaction;

        const totalGuilds = client.guilds.cache.size;
        const totalUsers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);

        const container = KyraUI.buildDashboard(
            `### 🌍 **Bot Reach**`,
            `Kyra X is currently serving across the Discord ecosystem:\n\n` +
            `${client.config.emojis.dot} **Total Guilds:** \`${totalGuilds.toLocaleString()}\`\n` +
            `${client.config.emojis.dot} **Total Users:** \`${totalUsers.toLocaleString()}\`\n\n` +
            `*Growing exponentially through elite performance.*`
        );

        const responseData = { components: container, flags: KyraUI.getFlags() };
        return isSlash ? interaction.reply(responseData) : message.reply(responseData);
    }
};
