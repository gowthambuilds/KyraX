import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize } from 'discord.js';
import { KyraUI } from '#classes/KyraUI';

export default {
    name: 'ownercmds',
    description: 'List all owner-only commands',
    aliases: ['ocmds'],
    ownerOnly: true,
    async execute({ client, message, interaction }) {
        // Owner Check
        const user = interaction ? interaction.user : message.author;
        if (!client.config.ownerId.includes(user.id)) {
            const error = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You are not authorized to use this command.`);
            if (interaction) return interaction.reply({ components: error, flags: KyraUI.getFlags(true) });
            return message.reply({ components: error, flags: KyraUI.getFlags() });
        }

        const commands = [
            { name: 'dbstats', description: 'View database statistics' },
            { name: 'maintenance', description: 'Toggle maintenance mode' },
            { name: 'nodestatus', description: 'View Lavalink node status' },
            { name: 'premium', description: 'Manage premium guilds' },
            { name: 'restart', description: 'Restart the bot' },
            { name: 'serverlist', description: 'List all servers' },
            { name: 'ownercmds', description: 'List all owner commands' }
        ];

        const container = new ContainerBuilder();

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent('### 👑 Owner Commands')
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
                .setSpacing(SeparatorSpacingSize.Small)
                .setDivider(true)
        );

        const list = commands.map(cmd => `**${cmd.name}** - ${cmd.description}`).join('\n');

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(list)
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
                .setSpacing(SeparatorSpacingSize.Small)
                .setDivider(false)
        );

        if (interaction) {
            return interaction.reply({ components: [container], flags: KyraUI.getFlags(true) });
        }
        return message.reply({ components: [container], flags: KyraUI.getFlags() });
    }
};
