export default {
    name: 'ping',
    description: 'Check bot latency',
    async execute({ message, interaction }) {
        const isSlash = !!interaction;
        const sent = isSlash ? await interaction.reply({ content: 'Pinging...', fetchReply: true }) : await message.reply('Pinging...');
        const createdTimestamp = isSlash ? interaction.createdTimestamp : message.createdTimestamp;
        const latency = sent.createdTimestamp - createdTimestamp;

        if (isSlash) {
            await interaction.editReply(`Pong! Latency: ${latency}ms`);
        } else {
            await sent.edit(`Pong! Latency: ${latency}ms`);
        }
    }
};
