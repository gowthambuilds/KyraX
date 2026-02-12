import { KyraUI } from '#classes/KyraUI';

export default {
    name: 'maintenance',
    description: 'Toggle global maintenance mode',
    ownerOnly: true,
    slash: true,
    options: [
        {
            name: 'on',
            description: 'Turn on maintenance mode',
            type: 1
        },
        {
            name: 'off',
            description: 'Turn off maintenance mode',
            type: 1
        }
    ],
    async execute({ client, message, interaction, args }) {
        const isSlash = !!interaction;
        if (isSlash) await interaction.deferReply({ flags: KyraUI.getFlags() });

        const subCommand = isSlash ? interaction.options.getSubcommand() : args[0]?.toLowerCase();

        const { BotStats } = await import('#src/database/index.js');

        if (subCommand === 'on') {
            // Turn on maintenance mode
            client.maintenanceMode = true;
            await BotStats.updateOne({ _id: 'global' }, { $set: { maintenanceMode: true } }, { upsert: true });

            const successContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.success} **Maintenance Mode** is now **ON**. All commands are disabled.`);
            return isSlash ? interaction.editReply({ components: successContainer }) : message.reply({ components: successContainer, flags: KyraUI.getFlags() });

        } else if (subCommand === 'off') {
            // Turn off maintenance mode
            client.maintenanceMode = false;
            await BotStats.updateOne({ _id: 'global' }, { $set: { maintenanceMode: false } }, { upsert: true });

            const successContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.success} **Maintenance Mode** is now **OFF**. All commands are enabled.`);
            return isSlash ? interaction.editReply({ components: successContainer }) : message.reply({ components: successContainer, flags: KyraUI.getFlags() });

        } else {
            // Show status
            const status = client.maintenanceMode ? '🔴 **ON** - Commands Disabled' : '🟢 **OFF** - Commands Enabled';
            const statusContainer = KyraUI.buildDashboard(
                `### 🔧 **Maintenance Mode Status**`,
                `**Status:** ${status}\n\n` +
                `**Prefix Commands:**\n` +
                `\`${client.config.bot.prefix}maintenance on\`\n` +
                `\`${client.config.bot.prefix}maintenance off\``
            );
            return isSlash ? interaction.editReply({ components: statusContainer }) : message.reply({ components: statusContainer, flags: KyraUI.getFlags() });
        }
    }
};
