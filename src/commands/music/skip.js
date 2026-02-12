import { KyraUI } from '#classes/KyraUI';

export default {
    name: 'skip',
    description: 'Skip the current playing song',
    aliases: ['s', 'next'],
    slash: true,
    async execute({ client, message, interaction }) {
        const member = interaction ? interaction.member : message.member;
        const player = client.lavalink.kazagumo.players.get(member.guild.id);

        if (!player) {
            const errorEmbed = KyraUI.buildSimpleMessage(`${client.config.emojis.error} There is no music playing in this server.`);
            return interaction ? interaction.reply({ components: errorEmbed, flags: KyraUI.getFlags() }) : message.reply({ components: errorEmbed, flags: KyraUI.getFlags() });
        }

        if (!member.voice.channel || member.voice.channel.id !== player.voiceId) {
            const errorEmbed = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You need to be in the same voice channel as me to skip songs.`);
            return interaction ? interaction.reply({ components: errorEmbed, flags: KyraUI.getFlags() }) : message.reply({ components: errorEmbed, flags: KyraUI.getFlags() });
        }

        const currentTrack = player.queue.current;
        player.skip();

        const skipEmbed = KyraUI.buildSimpleMessage(`${client.config.emojis.success} Skipped **${currentTrack.title}**.`);

        // If queue is empty after skip, mention autoplay if it's active or just say it's finished
        if (player.queue.length === 0 && player.data.get('autoplay')) {
            // Autoplay will handle the next song automatically via playerEmpty or trackEnd
        }

        return interaction ? interaction.reply({ components: skipEmbed, flags: KyraUI.getFlags() }) : message.reply({ components: skipEmbed, flags: KyraUI.getFlags() });
    }
};
