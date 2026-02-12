import { KyraUI } from '#classes/KyraUI';

export default {
    name: 'translate',
    description: 'Translates text to a specified language',
    aliases: ['tr'],
    slash: true,
    options: [
        { name: 'text', description: 'The text to translate', type: 3, required: true },
        { name: 'language', description: 'The target language (e.g., English, Hindi, Telugu)', type: 3, required: true }
    ],
    async execute({ client, message, interaction, args }) {
        const isSlash = !!interaction;

        const text = isSlash ? interaction.options.getString('text') : args.slice(1).join(' ');
        const language = isSlash ? interaction.options.getString('language') : args[0];

        if (!text || !language) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Please provide text and a target language.\nExample: \`translate Hindi Hello world\``);
            return isSlash ? interaction.reply({ components: errorContainer, flags: KyraUI.getFlags(true) }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        if (isSlash) await interaction.deferReply({ flags: KyraUI.getFlags() });

        try {
            const translation = await client.ai.translate(text, language);

            if (!translation) {
                const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} I failed to translate that text. Please try again later.`);
                return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
            }

            const container = KyraUI.buildDetailedDashboard(
                `### 🌐 **Translation**`,
                null,
                [
                    { name: 'Original', value: text },
                    { name: `Translated (${language})`, value: translation }
                ]
            );

            return isSlash ? interaction.editReply({ components: container }) : message.reply({ components: container, flags: KyraUI.getFlags() });
        } catch (error) {
            client.logger.error('Translate', 'Translation error', error);
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} An unexpected error occurred during translation.`);
            return isSlash ? (interaction.deferred ? interaction.editReply({ components: errorContainer }) : interaction.reply({ components: errorContainer, flags: KyraUI.getFlags(true) })) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }
    }
};
