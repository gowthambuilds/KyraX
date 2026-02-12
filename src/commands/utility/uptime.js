import { KyraUI } from '#classes/KyraUI';

export default {
    name: 'uptime',
    description: 'Shows how long the bot has been online.',
    aliases: ['up'],
    slash: true,
    async execute({ client, message, interaction }) {
        const isSlash = !!interaction;

        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor(uptime / 3600) % 24;
        const minutes = Math.floor(uptime / 60) % 60;
        const seconds = Math.floor(uptime % 60);

        const uptimeStrings = [];
        if (days > 0) uptimeStrings.push(`\`${days}d\``);
        if (hours > 0) uptimeStrings.push(`\`${hours}h\``);
        if (minutes > 0) uptimeStrings.push(`\`${minutes}m\``);
        uptimeStrings.push(`\`${seconds}s\``);

        const container = KyraUI.buildDashboard(
            `### ⏱️ **System Uptime**`,
            `Kyra X has been operating continuously for:\n\n` +
            `${client.config.emojis.dot} **Duration:** ${uptimeStrings.join(' ')}\n` +
            `${client.config.emojis.dot} **Status:** \`Operational\`\n\n` +
            `*Stability is the core of elite performance.*`
        );

        const responseData = { components: container, flags: KyraUI.getFlags() };
        return isSlash ? interaction.reply(responseData) : message.reply(responseData);
    }
};
