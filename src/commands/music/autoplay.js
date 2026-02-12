import { KyraUI } from '#classes/KyraUI';

export default {
    name: 'autoplay',
    description: 'Toggle autoplay mode',
    aliases: ['ap'],
    slash: true,
    async execute({ client, message, interaction }) {
        const member = interaction ? interaction.member : message.member;
        const guildId = interaction ? interaction.guildId : message.guildId;
        const channel = interaction ? interaction.channel : message.channel;
        let player = client.lavalink.kazagumo.players.get(guildId);

        if (!player) {
            // If no player, check if user is in a voice channel to start one
            if (!member.voice.channel) {
                const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You need to be in a voice channel to use this command.`);
                return interaction ? interaction.reply({ components: msg, flags: KyraUI.getFlags() }) : message.reply({ components: msg, flags: KyraUI.getFlags() });
            }

            // Create player
            player = await client.lavalink.kazagumo.createPlayer({
                guildId: guildId,
                textId: channel.id,
                voiceId: member.voice.channel.id,
                volume: 100,
                deaf: true
            });

            player.data.set('autoplay', true);

            const discoveryKeywords = ['lofi', 'slowed and reverb', 'trending hits 2026', 'hip hop beats', 'latest songs', 'popular', 'indie folk'];
            const keyword = discoveryKeywords[Math.floor(Math.random() * discoveryKeywords.length)];

            const loadingMsg = KyraUI.buildSimpleMessage(`${client.config.emojis.loading} Starting autoplay session with random tracks (\`${keyword}\`)...`);
            const rep = interaction ? await interaction.reply({ components: loadingMsg, flags: KyraUI.getFlags(), fetchReply: true }) : await message.reply({ components: loadingMsg, flags: KyraUI.getFlags() });

            const result = await client.lavalink.kazagumo.search(keyword, { requester: member.user });
            if (!result.tracks.length) {
                player.destroy();
                const errorMsg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Failed to start autoplay: Could not find any tracks.`);
                return interaction ? interaction.editReply({ components: errorMsg }) : rep.edit({ components: errorMsg });
            }

            player.play(result.tracks[Math.floor(Math.random() * Math.min(result.tracks.length, 10))]);

            const successMsg = KyraUI.buildSimpleMessage(`${client.config.emojis.success} **Autoplay Enabled** and music started!`);
            return interaction ? interaction.editReply({ components: successMsg }) : rep.edit({ components: successMsg });
        }

        const isAutoplay = player.data.get('autoplay') || false;
        player.data.set('autoplay', !isAutoplay);

        const state = !isAutoplay ? 'Enabled' : 'Disabled';
        const emoji = !isAutoplay ? client.config.emojis.success : client.config.emojis.error;

        const successMsg = KyraUI.buildSimpleMessage(`${emoji} **Autoplay ${state}**`);
        return interaction ? interaction.reply({ components: successMsg, flags: KyraUI.getFlags() }) : message.reply({ components: successMsg, flags: KyraUI.getFlags() });
    }
};
