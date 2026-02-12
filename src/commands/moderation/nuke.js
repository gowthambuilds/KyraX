import { KyraUI } from '#classes/KyraUI';
import { PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';

export default {
    name: 'nuke',
    description: 'Deletes and recreates the current channel',
    slash: true,
    async execute({ client, message, interaction }) {
        const isSlash = !!interaction;
        // nuke is a dangerous command, we don't auto-defer immediately to avoid stale interactions during confirmation if possible, 
        // but for consistency we defer ephemeral.
        // Actually, nuke usually requires confirmation, so standard defer might be okay.
        if (isSlash) await interaction.deferReply({ flags: KyraUI.getFlags() });

        const channel = isSlash ? interaction.channel : message.channel;
        const executor = isSlash ? interaction.member : message.member;
        const guild = isSlash ? interaction.guild : message.guild;

        // Check permissions (Executor)
        if (!executor.permissions.has(PermissionFlagsBits.Administrator)) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You need **Administrator** permissions to use this command.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        // Check permissions (Bot)
        if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} I need **Manage Channels** permissions.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        const confirmContainer = KyraUI.buildSimpleMessage(`### ⚠️ **Confirmation Required**\nAre you sure you want to nuke this channel? This action cannot be undone.`);
        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('nuke_confirm')
                .setLabel('Confirm Nuke')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('nuke_cancel')
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
        );

        const response = isSlash
            ? await interaction.editReply({ components: [...confirmContainer, buttons], fetchReply: true })
            : await message.reply({ components: [...confirmContainer, buttons], flags: KyraUI.getFlags() });

        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter: i => i.user.id === executor.id,
            time: 30000
        });

        collector.on('collect', async i => {
            if (i.customId === 'nuke_cancel') {
                await i.update({ components: KyraUI.buildSimpleMessage(`${client.config.emojis.error} Nuke cancelled.`) }); // Clear buttons
                return collector.stop();
            }

            if (i.customId === 'nuke_confirm') {
                await i.update({ components: KyraUI.buildSimpleMessage(`${client.config.emojis.loading} Nuking channel...`) });

                const position = channel.position;

                try {
                    // Clone the channel
                    const newChannel = await channel.clone();

                    // Delete the old one
                    await channel.delete();

                    // Background Logging
                    const { modLogger } = await import('#utils/modLogger');
                    modLogger.log(client, {
                        guild,
                        user: { id: channel.id, tag: channel.name },
                        moderator: executor.user,
                        type: 'nuke',
                        reason: `Nuked and recreated channel #${channel.name}`
                    }).catch(() => { });

                    // Ensure position is maintained
                    await newChannel.setPosition(position);

                    const successContent = `### ${client.config.emojis.success} **Nuke Successful**\nThis channel was successfully nuked by <@${executor.id}>.`;
                    const successContainer = KyraUI.buildSimpleMessage(successContent);

                    await newChannel.send({ components: successContainer, flags: KyraUI.getFlags() });
                } catch (error) {
                    client.logger.error('Nuke', 'Failed to nuke channel', error);
                    // We can't reply to the interaction easily if the channel is gone or if error happened before. 
                    // But if it failed to delete, we are still here.
                    const failureContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Failed to nuke the channel. Check my permissions.`);
                    try {
                        await i.followUp({ components: failureContainer, flags: KyraUI.getFlags() });
                    } catch { }
                }
                collector.stop();
            }
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time' && collected.size === 0) {
                const timeoutMsg = { components: KyraUI.buildSimpleMessage(`${client.config.emojis.error} Nuke timed out.`), components: [] };
                if (isSlash) {
                    await interaction.editReply(timeoutMsg).catch(() => { });
                } else {
                    await response.edit(timeoutMsg).catch(() => { });
                }
            }
        });
    }
};

