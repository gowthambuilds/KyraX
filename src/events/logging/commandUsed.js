import { Events } from 'discord.js';
import { EventLogger } from '#utils/eventLogger';

export default {
    name: 'commandUsed', // Custom event triggered by CommandHandler
    async execute({ client, interaction, message, commandName, args }, clientInstance) {
        const guild = interaction?.guild || message?.guild;
        if (!guild) return;

        const executor = interaction?.user || message?.author;

        await EventLogger.log(clientInstance, guild, 'bot', {
            title: '🤖 Command Executed',
            description: `The command \`${commandName}\` was used.`,
            fields: [
                { name: 'User', value: `<@${executor.id}> (\`${executor.tag}\`)`, inline: true },
                { name: 'Channel', value: `<#${interaction?.channelId || message?.channel.id}>`, inline: true },
                { name: 'Type', value: interaction ? 'Slash Command' : 'Prefix Command', inline: true },
                { name: 'Arguments', value: args.length > 0 ? `\`${args.join(' ')}\`` : 'None' }
            ]
        });
    }
};
