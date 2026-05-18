import { PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, TextDisplayBuilder, ContainerBuilder } from 'discord.js';
import { KyraUI } from '#classes/KyraUI';

export default {
    name: 'steal',
    description: 'Steal an emoji or sticker from a message and add it to the server',
    permissions: [PermissionFlagsBits.ManageEmojisAndStickers],
    slash: true,
    options: [
        {
            name: 'emoji',
            description: 'The emoji to steal',
            type: 3,
            required: false
        }
    ],
    async execute({ client, message, interaction, args }) {
        const isSlash = !!interaction;
        let targetContent = null;
        let sticker = null;

        // Check if replying
        const repliedMessage = isSlash ? null : (message.reference ? await message.channel.messages.fetch(message.reference.messageId).catch(() => null) : null);

        if (repliedMessage) {
            // Check for stickers first
            if (repliedMessage.stickers.size > 0) {
                sticker = repliedMessage.stickers.first();
            } else {
                // Parse for emojis in content
                const emojiMatch = repliedMessage.content.match(/<(a?):(\w+):(\d+)>/);
                if (emojiMatch) {
                    targetContent = {
                        animated: emojiMatch[1] === 'a',
                        name: emojiMatch[2],
                        id: emojiMatch[3]
                    };
                }
            }
        } else {
            const input = isSlash ? interaction.options.getString('emoji') : args?.[0];
            if (input) {
                const emojiMatch = input.match(/<(a?):(\w+):(\d+)>/);
                if (emojiMatch) {
                    targetContent = {
                        animated: emojiMatch[1] === 'a',
                        name: emojiMatch[2],
                        id: emojiMatch[3]
                    };
                }
            }
        }

        if (!targetContent && !sticker) {
            return KyraUI.sendUsage({ client, message, interaction }, 'steal [emoji] (or reply to a message)');
        }

        const name = sticker ? sticker.name : targetContent.name;
        const url = sticker ? sticker.url : `https://cdn.discordapp.com/emojis/${targetContent.id}.${targetContent.animated ? 'gif' : 'png'}`;

        const container = new ContainerBuilder();
        
        // Header
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🕵️ **Steal ${sticker ? 'Sticker' : 'Emoji'}**`));
        
        // Body
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`Would you like to add **${name}** to this server?\n\n*Choose the format below to proceed.*`));

        // Buttons (ActionRows are siblings to sections in ContainerBuilder)
        container.addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('steal_emoji').setLabel('Add as Emoji').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('steal_sticker').setLabel('Add as Sticker').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('steal_cancel').setLabel('Cancel').setStyle(ButtonStyle.Danger)
            )
        );

        const responseData = {
            components: [container],
            flags: KyraUI.getFlags()
        };

        const response = isSlash 
            ? await interaction.reply({ ...responseData, fetchReply: true })
            : await message.reply(responseData);

        const filter = (i) => i.user.id === (isSlash ? interaction.user.id : message.author.id);
        const collector = response.createMessageComponentCollector({ filter, componentType: ComponentType.Button, time: 30000 });

        collector.on('collect', async (i) => {
            if (i.customId === 'steal_cancel') {
                const cancelMsg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Action canceled.`);
                await i.update({ components: cancelMsg, flags: KyraUI.getFlags() });
                return collector.stop();
            }

            try {
                await i.deferUpdate();
                if (i.customId === 'steal_emoji') {
                    const emoji = await i.guild.emojis.create({ attachment: url, name: name });
                    const successMsg = KyraUI.buildSimpleMessage(`${client.config.emojis.success} Successfully added ${emoji} to the server!`);
                    await i.editReply({ components: successMsg, flags: KyraUI.getFlags() });
                } else if (i.customId === 'steal_sticker') {
                    const stickerEmoji = '✨'; // Required tag for stickers
                    const newSticker = await i.guild.stickers.create({ file: url, name: name, tags: stickerEmoji });
                    const successMsg = KyraUI.buildSimpleMessage(`${client.config.emojis.success} Successfully added **${newSticker.name}** as a sticker!`);
                    await i.editReply({ components: successMsg, flags: KyraUI.getFlags() });
                }
                collector.stop();
            } catch (error) {
                const errorMsg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Failed to add: ${error.message}`);
                await i.editReply({ components: errorMsg, flags: KyraUI.getFlags() });
            }
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time' && collected.size === 0) {
                const timeMsg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Request timed out.`);
                if (isSlash) interaction.editReply({ components: timeMsg, flags: KyraUI.getFlags() }).catch(() => {});
                else response.edit({ components: timeMsg, flags: KyraUI.getFlags() }).catch(() => {});
            }
        });
    }
};
