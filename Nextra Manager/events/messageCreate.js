export default {
    name: 'messageCreate',
    async execute(client, message) {
        if (message.author.bot || !message.guild) return;
        if (message.guild.id !== client.config.bot.mainGuildId) return;


        // Bot Ping Response
        if (message.content.match(new RegExp(`^<@!?${client.user.id}>( |)$`))) {
            const { TicketUI } = await import('#classes/TicketUI');
            const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder, TextDisplayBuilder } = await import('discord.js');

            const container = new ContainerBuilder();
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## Yo <@${message.author.id}>! 👋\nWsg? If you're lookin' for some **fire** dev work, you came to the right place. 🔥\n> Slide into a ticket if you're serious about a paid project. 💸\n\nPeep the website below fr. 👇`)
            );


            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('Visit Website')
                    .setURL(client.config.bot.website)
                    .setStyle(ButtonStyle.Link)
            );

            container.addActionRowComponents(row);

            return message.reply({
                components: [container],
                flags: TicketUI.getFlags()
            });
        }

        const settings = await client.db.getSettings(message.guild.id);


        // Feedback System Logic
        if (settings.feedbackChannelId && message.channel.id === settings.feedbackChannelId) {
            // client.logger.info('Feedback', 'Processing message in feedback channel');

            try {
                // Try to parse custom emoji ID from the config string like <:name:id>
                const checkEmoji = client.config.emojis.check;
                const emojiId = checkEmoji.match(/:(\d+)>/)?.[1];

                await message.react(emojiId || checkEmoji || '✅');
            } catch (error) {
                client.logger.error('Feedback', 'Failed to react to message', error);
            }

            const mentionedUsers = message.mentions.users;

            const staffRoles = settings.staffRoles || [];

            if (mentionedUsers.size > 0 && staffRoles.length > 0) {
                let validFeedback = false;
                const feedbacks = settings.feedbacks || {};

                for (const [userId, user] of mentionedUsers) {
                    if (user.bot) continue;
                    // Prevent self-feedback
                    if (userId === message.author.id) continue;

                    const member = await message.guild.members.fetch(userId).catch(() => null);

                    if (member && member.roles.cache.hasAny(...staffRoles)) {
                        feedbacks[userId] = (feedbacks[userId] || 0) + 1;
                        validFeedback = true;
                    }
                }

                if (validFeedback) {
                    settings.feedbacks = feedbacks;
                    await client.db.saveSettings(message.guild.id, settings);
                }
            }
        }

        const prefix = settings.prefix || client.config.bot.prefix;

        // YouTube Subscription Verification System
        if (settings.verificationChannelId && message.channel.id === settings.verificationChannelId) {
            if (message.attachments.size > 0) {
                const attachment = message.attachments.first();
                if (attachment.contentType && attachment.contentType.startsWith('image/')) {
                    const { processImage } = await import('#utils/imageProcessor');
                    const { TicketUI } = await import('#classes/TicketUI');

                    try {
                        const statusMsg = await message.reply({
                            components: TicketUI.buildSimpleMessage(`${client.config.emojis.loading} **Processing your verification image...**`),
                            flags: TicketUI.getFlags()
                        });

                        const result = await processImage(attachment.url);

                        if (result.success) {
                            const roleId = settings.verificationRoleId;
                            if (roleId) {
                                try {
                                    await message.member.roles.add(roleId);
                                    const successMsg = `## ${client.config.emojis.check} Verification Successful!\nCongratulations <@${message.author.id}>! You have been verified as a subscriber. The <@&${roleId}> role has been assigned to you.`;
                                    await statusMsg.edit({ components: TicketUI.buildSimpleMessage(successMsg) });
                                } catch (error) {
                                    client.logger.error('VERIFY', 'Role assignment failed', error);
                                    await statusMsg.edit({ components: TicketUI.buildSimpleMessage('⚠️ **Verification successful**, but I couldn\'t assign the role. Please contact an admin.') });
                                }
                            } else {
                                await statusMsg.edit({ components: TicketUI.buildSimpleMessage('⚠️ **Verification successful**, but no reward role is configured. Please contact an admin.') });
                            }
                        } else {
                            const failMsg = `## ${client.config.emojis.cross} Verification Failed\nI couldn't detect subscription indicators in your screenshot. Please ensure:\n- You are subscribed to [Nextra Forge Studios](https://www.youtube.com/@nextraforgestudios).\n- Your screenshot clearly shows the "Subscribed" button.\n- If the issue persists, contact support in our [Support Server](${client.config.bot.supportServer}).`;
                            await statusMsg.edit({ components: TicketUI.buildSimpleMessage(failMsg) });
                        }

                        // Cleanup original image after a short delay
                        setTimeout(() => {
                            message.delete().catch(() => { });
                        }, 2000);

                    } catch (error) {
                        client.logger.error('VERIFY', 'Verification error', error);
                        message.reply(`${client.config.emojis.cross} An error occurred during verification. Please try again later.`).catch(() => { });
                    }
                }
            }
        }

        if (!message.content.startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
        if (!command) return;

        try {
            await command.execute({ client, message, args });
        } catch (error) {
            client.logger.error('Commands', `Error executing command: ${commandName}`, error);
            message.reply('There was an error trying to execute that command!').catch(() => { });
        }
    }
};
