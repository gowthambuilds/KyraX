import { KyraUI } from '#classes/KyraUI';

export default {
    name: 'resetai',
    description: 'Reset your AI chat memory',
    aliases: ['resetchat', 'clearchat'],
    slash: true,
    async execute({ client, message, interaction }) {
        const isSlash = !!interaction;
        const userId = isSlash ? interaction.user.id : message.author.id;

        client.ai.resetMemory(userId);

        const success = KyraUI.buildSimpleMessage(`${client.config.emojis.success} Your conversation memory has been cleared.`);

        return isSlash
            ? interaction.reply({ components: success, flags: KyraUI.getFlags(true) })
            : message.reply({ components: success, flags: KyraUI.getFlags() }).then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000)).catch(() => { });
    }
};
