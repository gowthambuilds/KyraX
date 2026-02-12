import { KyraUI } from '#classes/KyraUI';

export default {
    name: 'join',
    description: 'Summon the bot to your voice channel',
    aliases: ['j', 'connect'],
    slash: true,
    async execute({ client, message, interaction }) {
        const member = interaction ? interaction.member : message.member;
        const channel = interaction ? interaction.channel : message.channel;

        if (!member.voice.channel) {
            const errorEmbed = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You need to be in a voice channel.`);
            return interaction ? interaction.reply({ components: errorEmbed, flags: KyraUI.getFlags() }) : message.reply({ components: errorEmbed, flags: KyraUI.getFlags() });
        }

        const existingPlayer = client.lavalink.kazagumo.players.get(member.guild.id);
        if (existingPlayer) {
            const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} I am already connected to <#${existingPlayer.voiceId}>.`);
            return interaction ? interaction.reply({ components: msg, flags: KyraUI.getFlags() }) : message.reply({ components: msg, flags: KyraUI.getFlags() });
        }

        try {
            // Optimize VC Bitrate for Quality
            // Tier 0: 64kbps (64000), Tier 1: 128kbps, etc.
            // But we should be careful not to override custom user settings too aggressively, or fail if no perms.
            // Check ManageChannels permission?
            // For now, let's just log it or try it if we have perms.

            if (member.voice.channel.viewable && member.voice.channel.manageable) {
                const maxBitrate = member.guild.maximumBitrate;
                if (member.voice.channel.bitrate < maxBitrate) {
                    await member.voice.channel.setBitrate(maxBitrate).catch(() => { });
                }
            }

            await client.lavalink.kazagumo.createPlayer({
                guildId: member.guild.id,
                textId: channel.id,
                voiceId: member.voice.channel.id,
                deaf: true
            });

            const successMsg = KyraUI.buildSimpleMessage(`${client.config.emojis.success} Connected to **${member.voice.channel.name}**.`);
            return interaction ? interaction.reply({ components: successMsg, flags: KyraUI.getFlags() }) : message.reply({ components: successMsg, flags: KyraUI.getFlags() });
        } catch (error) {
            client.logger.error('Music', 'Failed to join voice channel', error);
            const errorMsg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Failed to join voice channel.`);
            return interaction ? interaction.reply({ components: errorMsg, flags: KyraUI.getFlags() }) : message.reply({ components: errorMsg, flags: KyraUI.getFlags() });
        }
    }
};
