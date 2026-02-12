import { KyraUI } from '#classes/KyraUI';

export default {
    name: 'ping',
    description: 'Check bot latency',
    slash: true,
    async execute({ client, message, interaction }) {
        const isSlash = !!interaction;
        const startTime = Date.now();

        const content = `${client.config.emojis.loading} **Pinging...**`;
        const container = KyraUI.buildSimpleMessage(content);

        let response;
        if (isSlash) {
            response = await interaction.reply({ components: container, flags: KyraUI.getFlags(), fetchReply: true });
        } else {
            response = await message.reply({ components: container, flags: KyraUI.getFlags() });
        }

        const latency = Date.now() - startTime;
        const apiLatency = Math.round(client.ws.ping);

        const resultContainer = KyraUI.buildDashboard(
            `### ${client.config.emojis.ping} Pong!`,
            `**Bot Latency:** \`${apiLatency}ms\`\n**API Latency:** \`${latency}ms\``
        );

        if (isSlash) {
            await interaction.editReply({ components: resultContainer });
        } else {
            await response.edit({ components: resultContainer });
        }
    }
};
