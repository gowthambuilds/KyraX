import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize } from 'discord.js';

export class TempVCUtils {
    static buildPanel(channel, owner, tempVcData, client) {
        const isLocked = tempVcData.locked;
        const userLimit = channel.userLimit === 0 ? '∞ Unlimited' : channel.userLimit;
        const bitrate = `${channel.bitrate / 1000} kbps`;

        const container = new ContainerBuilder();

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent('### 🎙️ Voice Channel Controls')
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
                .setSpacing(SeparatorSpacingSize.Small)
                .setDivider(true)
        );

        const description = [
            `**Channel:** ${channel.name}`,
            `**Owner:** <@${tempVcData.ownerId}>`,
            `**Status:** ${isLocked ? '🔒 Locked' : '🔓 Unlocked'}`,
            `**Limit:** ${userLimit}`,
            `**Bitrate:** ${bitrate}`,
            '',
            'Use the buttons below to manage your channel.',
            'Channel will be destroyed immediately when the owner leaves.'
        ].join('\n');

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(description)
        );

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('tempvc_rename')
                .setEmoji('✏️')
                .setLabel('Rename')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('tempvc_limit')
                .setEmoji('👥')
                .setLabel('Limit')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('tempvc_lock')
                .setEmoji(isLocked ? '🔓' : '🔒')
                .setLabel(isLocked ? 'Unlock' : 'Lock')
                .setStyle(isLocked ? ButtonStyle.Success : ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('tempvc_bitrate')
                .setEmoji('🎵')
                .setLabel('Bitrate')
                .setStyle(ButtonStyle.Secondary)
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('tempvc_kick')
                .setEmoji('👢')
                .setLabel('Kick User')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('tempvc_ban')
                .setEmoji('🚫')
                .setLabel('Ban User')
                .setStyle(ButtonStyle.Danger)
        );

        container.addActionRowComponents(row1);
        container.addActionRowComponents(row2);

        return { components: [container] };
    }
}
