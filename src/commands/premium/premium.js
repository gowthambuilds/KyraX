import { KyraUI } from '#classes/KyraUI';
import { premiumService } from '#src/services/PremiumService.js';
import { PremiumUser, PremiumGuild, PremiumToken } from '#src/database/index.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Collection } from 'discord.js';

export default {
    name: 'premium',
    description: 'Manage premium features and tokens.',
    aliases: ['pr'],
    async execute({ client, message, args, prefix }) {
        const sub = args[0]?.toLowerCase();
        const guildPrefix = prefix || client.config.bot.prefix;
        const ownerIds = client.config.ownerId || [];
        const isOwner = ownerIds.includes(message.author.id);

        if (!sub) {
            const container = KyraUI.buildDashboard(
                `### ${client.config.emojis.premium} **Premium Management**`,
                `Manage the Kyra X premium ecosystem.\n\n` +
                `**User Commands:**\n` +
                `${client.config.emojis.dot} \`${guildPrefix}premium claim <code>\` - Claim a premium token for this server.\n` +
                `${client.config.emojis.dot} \`${guildPrefix}premium info <code>\` - Check token details.\n\n` +
                (isOwner ?
                    `**Owner Commands:**\n` +
                    `${client.config.emojis.dot} \`${guildPrefix}premium add <user|guild> <ID> <duration>\` - Manual activation.\n` +
                    `${client.config.emojis.dot} \`${guildPrefix}premium gen <duration> <uses>\` - Generate a guild premium token.\n` +
                    `${client.config.emojis.dot} \`${guildPrefix}premium remove <user|guild> <ID>\` - Remove premium.\n` +
                    `${client.config.emojis.dot} \`${guildPrefix}premium list <user|guild|token>\` - List entities.\n` +
                    `${client.config.emojis.dot} \`${guildPrefix}premium reset <user|guild|token>\` - Reset entities.` : '')
            );
            return message.channel.send({ components: container, flags: KyraUI.getFlags() });
        }

        switch (sub) {
            case 'add': {
                if (!isOwner) return message.channel.send(`${client.config.emojis.error} Owner only command.`);

                const type = args[1]?.toLowerCase(); // user or guild
                const targetId = message.mentions.users.first()?.id || args[2];
                const duration = args[3] || args[2];

                if (!type || !['user', 'guild'].includes(type) || !targetId || !duration) {
                    return message.channel.send(`${client.config.emojis.error} Usage: \`${guildPrefix}premium add <user|guild> <ID> <duration>\``);
                }

                // If duration was actually in args[2] because targetId was a mention
                const finalDuration = (message.mentions.users.size > 0 && args.length === 3) ? args[2] : duration;

                await premiumService.addPremium(targetId, finalDuration, type, null, message.author.id);
                return message.channel.send(`${client.config.emojis.success} Successfully activated **${type}** premium for **${targetId}** for **${finalDuration}**.`);
            }

            case 'claim': {
                const code = args[1];
                if (!code) {
                    return message.channel.send(`${client.config.emojis.error} Please provide a token code: \`${guildPrefix}premium claim <code>\``);
                }

                const isPremium = premiumService.isGuildPremium(message.guild.id);
                if (isPremium) {
                    return message.channel.send(`${client.config.emojis.error} This server already has an active **Kyra Premium** subscription.`);
                }

                const token = await PremiumToken.findOne({ code });
                if (!token) {
                    return message.channel.send(`${client.config.emojis.error} Invalid token code.`);
                }

                if (token.remainingUses <= 0) {
                    return message.channel.send(`${client.config.emojis.error} This token has reached its maximum usage limit.`);
                }

                if (premiumService.isGuildPremium(message.guild.id)) {
                    return message.channel.send(`${client.config.emojis.error} **Premium is already active in this guild!** Try claiming it in another guild or leave.`);
                }

                if (token.claimedBy.includes(message.guild.id)) {
                    return message.channel.send(`${client.config.emojis.error} This guild has already claimed this token.`);
                }

                const duration = token.duration === 'life' ? 'Lifetime' : token.duration;
                const confirmationMsg = `### ⚠️ **Confirmation Required**\n` +
                    `Are you sure you want to claim **${duration}** premium for this guild?\n\n` +
                    `**Guild ID:** \`${message.guild.id}\``;

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('confirm_claim')
                        .setLabel('Confirm')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('cancel_claim')
                        .setLabel('Cancel')
                        .setStyle(ButtonStyle.Danger)
                );

                const container = KyraUI.buildSimpleMessage(confirmationMsg)[0];
                const msg = await message.channel.send({
                    components: [container, row],
                    flags: KyraUI.getFlags()
                });

                const collector = msg.createMessageComponentCollector({
                    filter: i => i.user.id === message.author.id,
                    time: 30000,
                    max: 1
                });

                collector.on('collect', async i => {
                    if (i.customId === 'confirm_claim') {
                        await i.deferUpdate();
                        const result = await premiumService.redeemToken(message.guild.id, code, message.author.id);
                        const emoji = result.success ? client.config.emojis.success : client.config.emojis.error;
                        await i.editReply({
                            components: KyraUI.buildSimpleMessage(`${emoji} ${result.message}`),
                        });
                    } else {
                        await i.deferUpdate();
                        await i.editReply({
                            components: KyraUI.buildSimpleMessage(`${client.config.emojis.error} Token redemption cancelled.`),
                        });
                    }
                });

                collector.on('end', async (collected, reason) => {
                    if (reason === 'time') {
                        await msg.edit({
                            components: KyraUI.buildSimpleMessage(`${client.config.emojis.error} Token redemption timed out.`),
                        }).catch(() => { });
                    }
                });

                return;
            }

            case 'info': {
                const code = args[1];
                if (!code) {
                    return message.channel.send(`${client.config.emojis.error} Usage: \`${guildPrefix}premium info <code>\``);
                }

                const token = await PremiumToken.findOne({ code });
                if (!token) {
                    return message.channel.send(`${client.config.emojis.error} Invalid token code.`);
                }

                const duration = token.duration === 'life' ? 'Lifetime' : token.duration;
                const container = KyraUI.buildSimpleMessage(
                    `### 🎫 **Token Information**\n\n` +
                    `${client.config.emojis.dot} **Status:** ${token.remainingUses > 0 ? '`ACTIVE`' : '`EXHAUSTED`'}\n` +
                    `${client.config.emojis.dot} **Duration:** \`${duration}\`\n` +
                    `${client.config.emojis.dot} **Remaining Uses:** \`${token.remainingUses}/${token.totalUses}\`\n` +
                    `${client.config.emojis.dot} **Created At:** <t:${Math.floor(token.createdAt.getTime() / 1000)}:f>`
                );

                return message.channel.send({ components: container, flags: KyraUI.getFlags() });
            }

            case 'gen': {
                if (!isOwner) return message.channel.send(`${client.config.emojis.error} Owner only command.`);

                const duration = args[1]?.toLowerCase() || 'life';
                const uses = parseInt(args[2]) || 1;

                if (uses < 1) return message.channel.send(`${client.config.emojis.error} Uses must be at least 1.`);

                // Generate a random code: KYRA-XXXX-XXXX-XXXX
                const code = 'KYRA-' + Array.from({ length: 3 }, () =>
                    Math.random().toString(36).substring(2, 6).toUpperCase()
                ).join('-');

                const newToken = new PremiumToken({
                    code,
                    duration,
                    totalUses: uses,
                    remainingUses: uses
                });

                await newToken.save();

                const container = KyraUI.buildSimpleMessage(
                    `### 🎫 **Guild Token Generated**\n\n` +
                    `${client.config.emojis.dot} **Code:** \`${code}\`\n` +
                    `${client.config.emojis.dot} **Duration:** \`${duration === 'life' ? 'Lifetime' : duration}\`\n` +
                    `${client.config.emojis.dot} **Uses:** \`${uses}\`\n\n` +
                    `*Share this code with a guild owner to activate premium!*`
                );

                return message.channel.send({ components: container, flags: KyraUI.getFlags() });
            }

            case 'list': {
                if (!isOwner) return message.channel.send(`${client.config.emojis.error} Owner only command.`);
                const type = args[1]?.toLowerCase();

                if (type === 'token') {
                    // Auto-delete exhausted tokens
                    await PremiumToken.deleteMany({ remainingUses: { $lte: 0 } });

                    const tokens = await PremiumToken.find({}).sort({ createdAt: -1 }).limit(10);
                    if (tokens.length === 0) return message.channel.send('No tokens found.');

                    const list = tokens.map((t, i) => {
                        let info = `**${i + 1}.** \`${t.code}\` (${t.duration})\n` +
                            `${client.config.emojis.dot} Status: ${t.remainingUses > 0 ? '`ACTIVE`' : '`EXHAUSTED`'}\n` +
                            `${client.config.emojis.dot} Uses: \`${t.remainingUses}/${t.totalUses}\``;

                        if (t.claims && t.claims.length > 0) {
                            const lastClaim = t.claims[t.claims.length - 1];
                            info += `\n${client.config.emojis.dot} Last Claim: \`${lastClaim.guildId}\` by <@${lastClaim.userId}>`;
                        }
                        return info;
                    }).join('\n\n');

                    const container = KyraUI.buildSimpleMessage(`### 🎫 **Guild Tokens (Recent 10)**\n\n${list}`);
                    return message.channel.send({ components: container, flags: KyraUI.getFlags() });
                }

                if (type === 'user') {
                    const users = Array.from(premiumService.users.values());
                    if (users.length === 0) return message.channel.send('No premium users found in cache.');

                    const list = users.map((u, i) => `**${i + 1}.** <@${u.userId}> (\`${u.userId}\`)\n` +
                        `${client.config.emojis.dot} Expiry: ${u.expiry ? `<t:${Math.floor(u.expiry / 1000)}:f>` : 'Lifetime'}`).join('\n\n');

                    const container = KyraUI.buildSimpleMessage(`### 👑 **Premium Users**\n\n${list}`);
                    return message.channel.send({ components: container, flags: KyraUI.getFlags(), allowedMentions: { parse: [] } });
                }

                if (type === 'guild') {
                    const guilds = Array.from(premiumService.guilds.values());
                    if (guilds.length === 0) return message.channel.send('No premium guilds found in cache.');

                    const list = guilds.map((g, i) => `**${i + 1}.** \`${g.guildId}\`\n` +
                        `${client.config.emojis.dot} Expiry: ${g.expiry ? `<t:${Math.floor(g.expiry / 1000)}:f>` : 'Lifetime'}`).join('\n\n');

                    const container = KyraUI.buildSimpleMessage(`### 🏢 **Premium Guilds**\n\n${list}`);
                    return message.channel.send({ components: container, flags: KyraUI.getFlags() });
                }

                return message.channel.send(`Usage: \`${guildPrefix}premium list <user|guild|token>\``);
            }

            case 'remove': {
                if (!isOwner) return message.channel.send(`${client.config.emojis.error} Owner only command.`);
                const type = args[1]?.toLowerCase();
                const id = message.mentions.users.first()?.id || args[2];

                if (!['user', 'guild'].includes(type) || !id) {
                    return message.channel.send(`Usage: \`${guildPrefix}premium remove <user|guild> <@user|id>\``);
                }

                await premiumService.removePremium(id, type, false, message.author.id);
                return message.channel.send(`${client.config.emojis.success} Successfully removed premium from **${type}** (\`${id}\`).`);
            }

            case 'reset': {
                if (!isOwner) return message.channel.send(`${client.config.emojis.error} Owner only command.`);
                const type = args[1]?.toLowerCase();

                if (!['user', 'guild', 'token'].includes(type)) {
                    return message.channel.send(`Usage: \`${guildPrefix}premium reset <user|guild|token>\``);
                }

                const confirmationMsg = `### ⚠️ **CRITICAL: System Reset Confirmation**\n` +
                    `This will **PERMANENTLY DELETE** all **${type.toUpperCase()}** premium data from the database and cache.\n\n` +
                    `Are you absolutely sure you want to proceed? This action cannot be undone.`;

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('confirm_reset')
                        .setLabel(`Yes, Reset All ${type.charAt(0).toUpperCase() + type.slice(1)}s`)
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('cancel_reset')
                        .setLabel('Cancel')
                        .setStyle(ButtonStyle.Secondary)
                );

                const container = KyraUI.buildSimpleMessage(confirmationMsg)[0];
                const msg = await message.channel.send({
                    components: [container, row],
                    flags: KyraUI.getFlags()
                });

                const collector = msg.createMessageComponentCollector({
                    filter: i => i.user.id === message.author.id,
                    time: 30000,
                    max: 1
                });

                collector.on('collect', async i => {
                    if (i.customId === 'confirm_reset') {
                        await i.deferUpdate();
                        let count = 0;
                        if (type === 'token') {
                            count = await PremiumToken.countDocuments();
                            await PremiumToken.deleteMany({});
                        } else if (type === 'user') {
                            count = premiumService.users.size;
                            await PremiumUser.deleteMany({});
                            premiumService.users.clear();
                        } else if (type === 'guild') {
                            count = premiumService.guilds.size;
                            await PremiumGuild.deleteMany({});
                            premiumService.guilds.clear();
                        }

                        // Send Log for Reset
                        const logChannelId = client.config.bot.logs.premium;
                        if (logChannelId) {
                            const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
                            if (logChannel) {
                                const logContainer = KyraUI.buildDashboard(
                                    `### 🚨 **Premium Log: Full Reset**`,
                                    `${client.config.emojis.dot} **Type:** \`${type.toUpperCase()}S\`\n` +
                                    `${client.config.emojis.dot} **Status:** 🗑️ \`WIPED\`\n` +
                                    `${client.config.emojis.dot} **Entries Removed:** \`${count}\`\n` +
                                    `${client.config.emojis.dot} **Reset By:** <@${message.author.id}> (\`${message.author.id}\`)\n` +
                                    `\n*This action cleared all premium data for this entity type.*`
                                );
                                await logChannel.send({ components: logContainer });
                            }
                        }

                        const successEmoji = client.config.emojis.success;
                        await i.editReply({
                            components: KyraUI.buildSimpleMessage(`${successEmoji} Successfully reset all **${type}** data. (Removed ${count} entries)`),
                        });
                    } else {
                        await i.deferUpdate();
                        await i.editReply({
                            components: KyraUI.buildSimpleMessage(`${client.config.emojis.error} Reset operation cancelled.`),
                        });
                    }
                });

                collector.on('end', async (collected, reason) => {
                    if (reason === 'time') {
                        await msg.edit({
                            components: KyraUI.buildSimpleMessage(`${client.config.emojis.error} Reset operation timed out.`),
                        }).catch(() => { });
                    }
                });

                return;
            }

            default:
                return message.channel.send(`${client.config.emojis.error} Unknown subcommand. Use \`${guildPrefix}premium\` for help.`);
        }
    }
};
