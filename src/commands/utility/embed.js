import { KyraUI } from '#classes/KyraUI';
import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, PermissionFlagsBits, MediaGalleryBuilder, MediaGalleryItemBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default {
    name: 'embed',
    description: 'Use this command to send Components V2 embeds',
    aliases: ['container'],
    slash: false, // Wizard works better with prefix commands
    permissions: [PermissionFlagsBits.ManageMessages],
    async execute({ client, message, interaction, args }) {
        const user = message.author;
        const channel = message.channel;

        // Step 1: Confirmation
        const startContainer = KyraUI.buildDashboard(
            `## 📝 **Embed Wizard**`,
            `Let's start editing your Components V2 embed!\n\n` +
            `${client.config.emojis.dot} I'll guide you through creating a custom embed\n` +
            `${client.config.emojis.dot} Type **yes** to proceed or **no** to cancel`
        );

        await message.reply({ components: startContainer, flags: KyraUI.getFlags() });

        // Collect confirmation
        const confirmFilter = m => m.author.id === user.id && ['yes', 'no'].includes(m.content.toLowerCase());
        const confirmCollected = await channel.awaitMessages({ filter: confirmFilter, max: 1, time: 30000, errors: ['time'] })
            .catch(() => null);

        if (!confirmCollected || confirmCollected.first().content.toLowerCase() === 'no') {
            const cancelContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Embed creation cancelled.`);
            return message.reply({ components: cancelContainer, flags: KyraUI.getFlags(true) })
                .then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
        }

        // Step 2: Ask for title
        const titleContainer = KyraUI.buildSimpleMessage(
            `${client.config.emojis.dot} **Step 1/5:** Please provide the **title** for your embed.`
        );
        await message.reply({ components: titleContainer, flags: KyraUI.getFlags() });

        const titleFilter = m => m.author.id === user.id;
        const titleCollected = await channel.awaitMessages({ filter: titleFilter, max: 1, time: 60000, errors: ['time'] })
            .catch(() => null);

        if (!titleCollected) {
            const timeoutContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Timed out. Embed creation cancelled.`);
            return message.reply({ components: timeoutContainer, flags: KyraUI.getFlags(true) })
                .then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
        }

        const title = titleCollected.first().content;

        // Step 3: Ask for description/body
        const descContainer = KyraUI.buildSimpleMessage(
            `${client.config.emojis.dot} **Step 2/5:** Please provide the **description/body** for your embed.`
        );
        await message.reply({ components: descContainer, flags: KyraUI.getFlags() });

        const descFilter = m => m.author.id === user.id;
        const descCollected = await channel.awaitMessages({ filter: descFilter, max: 1, time: 120000, errors: ['time'] })
            .catch(() => null);

        if (!descCollected) {
            const timeoutContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Timed out. Embed creation cancelled.`);
            return message.reply({ components: timeoutContainer, flags: KyraUI.getFlags(true) })
                .then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
        }

        const description = descCollected.first().content;

        // Step 4: Ask for optional image
        const imageContainer = KyraUI.buildSimpleMessage(
            `${client.config.emojis.dot} **Step 3/5:** Provide an **image URL** or **upload an image** (optional).\n\nType **skip** to skip this step.`
        );
        await message.reply({ components: imageContainer, flags: KyraUI.getFlags() });

        const imageFilter = m => m.author.id === user.id;
        const imageCollected = await channel.awaitMessages({ filter: imageFilter, max: 1, time: 60000, errors: ['time'] })
            .catch(() => null);

        if (!imageCollected) {
            const timeoutContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Timed out. Embed creation cancelled.`);
            return message.reply({ components: timeoutContainer, flags: KyraUI.getFlags(true) })
                .then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
        }

        const imageMessage = imageCollected.first();
        let imageURL = null;

        // Check if user uploaded an attachment
        if (imageMessage.attachments.size > 0) {
            const attachment = imageMessage.attachments.first();
            if (attachment.contentType?.startsWith('image/')) {
                imageURL = attachment.url;
            }
        }
        // Otherwise check if they provided a URL
        else if (imageMessage.content.toLowerCase() !== 'skip') {
            imageURL = imageMessage.content;
        }

        // Step 5: Ask for optional buttons
        const buttons = [];
        for (let i = 1; i <= 2; i++) {
            const skipText = i === 1 ? 'skip' : 'skip to finish buttons';
            const buttonContainer = KyraUI.buildSimpleMessage(
                `${client.config.emojis.dot} **Step 4/5 (Button ${i}):** Provide a **button name and URL** (e.g., \`Visit Google, https://google.com\`).\n\nType **${skipText}** to skip.`
            );
            await message.reply({ components: buttonContainer, flags: KyraUI.getFlags() });

            const buttonFilter = m => m.author.id === user.id;
            const buttonCollected = await channel.awaitMessages({ filter: buttonFilter, max: 1, time: 60000, errors: ['time'] })
                .catch(() => null);

            if (!buttonCollected) break;

            const buttonInput = buttonCollected.first().content;
            if (buttonInput.toLowerCase() === 'skip' || buttonInput.toLowerCase() === 'skip to finish buttons') break;

            const [name, url] = buttonInput.split(',').map(s => s.trim());
            if (name && url && (url.startsWith('http://') || url.startsWith('https://'))) {
                buttons.push({ name, url });
            } else {
                const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Invalid format! Button must be \`Name, URL\`. Skipping this button.`);
                await message.reply({ components: errorContainer, flags: KyraUI.getFlags(true) });
            }
        }

        // Step 6: Ask for target channel
        const channelContainer = KyraUI.buildSimpleMessage(
            `${client.config.emojis.dot} **Step 5/5:** Mention the **target channel** or provide channel ID.\n\nType **here** to send in this channel.`
        );
        await message.reply({ components: channelContainer, flags: KyraUI.getFlags() });

        const channelFilter = m => m.author.id === user.id;
        const channelCollected = await channel.awaitMessages({ filter: channelFilter, max: 1, time: 60000, errors: ['time'] })
            .catch(() => null);

        if (!channelCollected) {
            const timeoutContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Timed out. Embed creation cancelled.`);
            return message.reply({ components: timeoutContainer, flags: KyraUI.getFlags(true) })
                .then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
        }

        let targetChannel = channel;
        const channelInput = channelCollected.first().content.toLowerCase();

        if (channelInput !== 'here') {
            const channelMention = channelInput.match(/<#(\d+)>/);
            const channelId = channelMention ? channelMention[1] : channelInput;
            targetChannel = message.guild.channels.cache.get(channelId);

            if (!targetChannel) {
                const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Invalid channel! Sending to current channel instead.`);
                await message.reply({ components: errorContainer, flags: KyraUI.getFlags(true) })
                    .then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
                targetChannel = channel;
            }
        }

        // Check permissions
        if (!targetChannel.permissionsFor(message.member).has(PermissionFlagsBits.SendMessages)) {
            const errorContainer = KyraUI.buildSimpleMessage(
                `${client.config.emojis.error} You don't have permission to send messages in ${targetChannel}!`
            );
            return message.reply({ components: errorContainer, flags: KyraUI.getFlags(true) })
                .then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
        }

        // Build the final embed container
        const embedContainer = new ContainerBuilder();

        // Add title
        embedContainer.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## ${title}`)
        );

        // Add separator
        embedContainer.addSeparatorComponents(
            new SeparatorBuilder()
                .setSpacing(SeparatorSpacingSize.Small)
                .setDivider(true)
        );

        // Add description
        embedContainer.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(description)
        );

        // Add image if provided
        if (imageURL && (imageURL.toLowerCase().startsWith('http://') || imageURL.toLowerCase().startsWith('https://'))) {
            try {
                const gallery = new MediaGalleryBuilder()
                    .addItems(new MediaGalleryItemBuilder().setURL(imageURL));
                embedContainer.addMediaGalleryComponents(gallery);
            } catch (error) {
                console.log('Failed to add image:', error.message);
            }
        }

        // Add buttons if provided
        if (buttons.length > 0) {
            const row = new ActionRowBuilder();
            buttons.forEach(btn => {
                row.addComponents(
                    new ButtonBuilder()
                        .setLabel(btn.name)
                        .setURL(btn.url)
                        .setStyle(ButtonStyle.Link)
                );
            });
            embedContainer.addActionRowComponents(row);
        }

        // Send the embed
        try {
            await targetChannel.send({
                components: [embedContainer],
                flags: KyraUI.getFlags()
            });

            const successContainer = KyraUI.buildSimpleMessage(
                `${client.config.emojis.success} Embed sent successfully to ${targetChannel}!`
            );
            await message.reply({ components: successContainer, flags: KyraUI.getFlags(true) })
                .then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
        } catch (error) {
            const errorContainer = KyraUI.buildSimpleMessage(
                `${client.config.emojis.error} Failed to send embed: ${error.message}`
            );
            await message.reply({ components: errorContainer, flags: KyraUI.getFlags(true) })
                .then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
        }
    }
};
