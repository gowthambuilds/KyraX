import { KyraUI } from '#classes/KyraUI';

export default {
    name: 'membercount',
    description: 'Shows the total number of members in the server.',
    aliases: ['mc', 'guildmembercount'],
    slash: true,
    async execute({ client, message, interaction }) {
        const isSlash = !!interaction;
        const guild = isSlash ? interaction.guild : message.guild;

        const totalMembers = guild.memberCount;
        const humans = guild.members.cache.filter(m => !m.user.bot).size;
        const bots = totalMembers - humans;

        const container = KyraUI.buildDashboard(
            `### 📊 **Server Statistics**`,
            `The current population of **${guild.name}**:\n\n` +
            `${client.config.emojis.dot} **Total Members:** \`${totalMembers.toLocaleString()}\`\n` +
            `${client.config.emojis.dot} **Humans:** \`${humans.toLocaleString()}\`\n` +
            `${client.config.emojis.dot} **Bots:** \`${bots.toLocaleString()}\``
        );

        const responseData = { components: container, flags: KyraUI.getFlags() };
        return isSlash ? interaction.reply(responseData) : message.reply(responseData);
    }
};
