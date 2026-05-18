import { Events, PermissionFlagsBits } from 'discord.js';
import { KyraUI } from '#classes/KyraUI';
import { Guild, Member, User, AutoResponse, AutoReactor } from '#src/database/index.js';
import { premiumService } from '#src/services/PremiumService.js';

export default {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (message.author.bot && !message.webhookId) return;
        if (!message.guild) return;

        // --- Webhook Spam Detection (kept as is) ---
        if (message.webhookId) {
            const guild = message.guild;
            const webhookId = message.webhookId;
            if (!client.webhookStats) client.webhookStats = new Map();
            const stats = client.webhookStats.get(webhookId) || { count: 0, lastReset: Date.now() };

            if (Date.now() - stats.lastReset > 5000) {
                stats.count = 0;
                stats.lastReset = Date.now();
            }

            stats.count++;
            client.webhookStats.set(webhookId, stats);

            if (stats.count === 10) {
                const { EventLogger } = await import('#utils/eventLogger');
                await EventLogger.log(client, guild, 'important', {
                    title: '🚨 WEBHOOK SPAM DETECTED',
                    description: `A webhook (\`${webhookId}\`) is sending messages at a high frequency in <#${message.channel.id}>.`,
                    fields: [
                        { name: 'Channel', value: `<#${message.channel.id}>` },
                        { name: 'Action', value: 'Monitor this channel for potential webhook abuse.' }
                    ]
                });
            }
            return;
        }

        // --- PERFORMANCE OPTIMIZATION: Early Identification ---
        const isOwner = client.config.ownerId.includes(message.author.id);
        const defaultPrefix = client.config.bot.prefix;
        const guildSettings = await Guild.findById(message.guild.id).lean();

        // --- Ignore Logic Check ---
        const isAdmin = message.member?.permissions.has(PermissionFlagsBits.Administrator);
        const isIgnored = !isOwner && !isAdmin && (
            guildSettings?.ignored?.channels?.includes(message.channel.id) ||
            guildSettings?.ignored?.users?.includes(message.author.id) ||
            message.member?.roles?.cache.some(r => guildSettings?.ignored?.roles?.includes(r.id))
        );

        const mentionRegex = new RegExp(`^<@!?${client.user.id}>`);

        const isMention = mentionRegex.test(message.content);
        const hasDefaultPrefix = message.content.startsWith(defaultPrefix);

        let commandName = null;
        let usedPrefix = '';
        let args = [];

        if (isMention) {
            usedPrefix = message.content.match(mentionRegex)[0];
            const contentAfterMention = message.content.slice(usedPrefix.length).trim();
            args = contentAfterMention.split(/ +/);
            commandName = args.shift()?.toLowerCase();
        } else if (hasDefaultPrefix) {
            usedPrefix = defaultPrefix;
            const contentAfterPrefix = message.content.slice(usedPrefix.length).trim();
            args = contentAfterPrefix.split(/ +/);
            commandName = args.shift()?.toLowerCase();
        }

        // --- COMMAND DETECTION & SECURITY ---
        if (commandName) {
            const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases?.includes(commandName));
            if (command) {
                // 1. Prefix Verification
                let prefix = guildSettings?.prefix || defaultPrefix;

                // --- Ignore Logic Check (Commands Only) ---

                if (isIgnored && command.name !== 'afk') return;

                const priorityCommands = ['ban', 'kick', 'mute', 'timeout', 'warn', 'ping', 'purge', 'nuke'];
                const isPriority = priorityCommands.includes(commandName) || priorityCommands.includes(command.name);

                // If not a mention, and prefix doesn't match, it's not our command
                if (!isMention && usedPrefix !== prefix && usedPrefix === defaultPrefix) {
                    // Custom prefix mismatch, fall through to regular data fetching
                } else {
                    // 2. Security Checks
                    if (command.ownerOnly && !isOwner) {
                        const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} This command is **owner-only**.`);
                        return message.reply({ components: msg, flags: KyraUI.getFlags() });
                    }

                    if (client.maintenanceMode && !isOwner) {
                        const maintenanceContainer = KyraUI.buildSimpleMessage(`⚙️ **Under Maintenance**\n\nSorry for the inconvenience! **Kyra X** is undergoing regular maintenance.`);
                        return message.reply({ components: maintenanceContainer, flags: KyraUI.getFlags() });
                    }

                    if (command.permissions && command.permissions.length > 0) {
                        const missingPerms = command.permissions.filter(perm => !message.member?.permissions.has(perm));
                        if (missingPerms.length > 0 && !isOwner) {
                            const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You do not have permission to use this command.`);
                            return message.reply({ components: msg, flags: KyraUI.getFlags() });
                        }
                    }

                    // 3. PRIORITY EXECUTION (Ultrafast)
                    if (isPriority) {
                        client.logger.debug('MSG_CREATE', `Executing PRIORITY command: ${commandName}`);
                        try {
                            await command.execute({ client, message, args, prefix });
                            client.emit('commandUsed', { client, message, commandName: command.name, args }, client);
                            return;
                        } catch (error) {
                            client.logger.error('MSG_CREATE', `Error in PRIORITY command ${commandName}:`, error);
                            // Fall through or return
                            return;
                        }
                    }
                }
            }
        }

        // --- REGULAR PATH (Implicitly handles AutoResponses, Non-Priority commands, and AI Chat) ---
        const lowerContent = message.content.toLowerCase().trim();
        const fetches = [
            Guild.findById(message.guild.id).lean(),
            Member.findOne({ guildId: message.guild.id, userId: message.author.id }).lean(),
            AutoResponse.findOne({ guildId: message.guild.id, trigger: lowerContent }).lean(),
            AutoReactor.findOne({ guildId: message.guild.id, trigger: lowerContent }).lean()
        ];

        const firstMention = message.mentions.users.first();
        if (firstMention && firstMention.id !== message.author.id && !firstMention.bot) {
            fetches.push(Member.findOne({ guildId: message.guild.id, userId: firstMention.id }).lean());
        }

        const resolved = await Promise.all(fetches);
        // guildSettings is already fetched at the top
        const memberData = resolved[1];
        const autoResponder = resolved[2];
        const autoReactor = resolved[3];
        const mentionedMemberData = resolved[4];
        const prefix = guildSettings?.prefix || defaultPrefix;

        // --- AFK Removal (Non-blocking) ---
        if (memberData?.afk?.status) {
            Member.updateOne({ _id: memberData._id }, { 'afk.status': false, 'afk.reason': null, 'afk.timestamp': null }).catch(() => { });
            const welcomeBack = KyraUI.buildSimpleMessage(`${client.config.emojis.success} Welcome back **${message.author.username}**! I've removed your AFK status.`);
            message.reply({ allowedMentions: { repliedUser: true }, components: welcomeBack, flags: KyraUI.getFlags() }).then(msg => {
                setTimeout(() => msg.delete().catch(() => { }), 5000);
            }).catch(() => { });
        }

        // --- AFK Alert & Mention Tracking ---
        if (firstMention && mentionedMemberData?.afk?.status) {
            const afkAlert = KyraUI.buildSimpleMessage(`${client.config.emojis.dot} **${firstMention.username}** is currently AFK: *${mentionedMemberData.afk.reason}*`);
            message.reply({ allowedMentions: { repliedUser: false }, components: afkAlert, flags: KyraUI.getFlags() }).catch(() => { });
        }

        if (message.mentions.users.size > 0) {
            const mentionedUsers = message.mentions.users.filter(u => !u.bot && u.id !== message.author.id);
            Array.from(mentionedUsers.values()).forEach(user => {
                User.findOneAndUpdate({ _id: user.id }, { $push: { lastPings: { $each: [{ guildId: message.guild.id, channelId: message.channel.id, authorId: message.author.id, content: message.content, timestamp: new Date() }], $slice: -5 } } }, { upsert: true }).catch(() => { });
            });
        }

        // --- Auto Responders & Reactors (Enabled Globally) ---
        if (autoResponder) message.channel.send({ content: autoResponder.response }).catch(() => { });
        if (autoReactor) message.react(autoReactor.emoji).catch(() => { });

        // --- REGULAR COMMAND DISPATCH ---
        const isUserPremium = premiumService.isUserPremium(message.author.id);
        let finalUsedPrefix = prefix;
        let isPrefixless = false;

        if (isMention) {
            finalUsedPrefix = message.content.match(mentionRegex)[0];
        } else if (!message.content.startsWith(prefix)) {
            if (isUserPremium) {
                const potentialCmd = message.content.split(/\s+/)[0].toLowerCase();
                const commandExists = client.commands.get(potentialCmd) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(potentialCmd));
                if (commandExists) { isPrefixless = true; finalUsedPrefix = ''; }
            }
            if (!isPrefixless) {
                // AI Chat Logic (Restricted by Ignore)
                const aiConf = guildSettings?.ai || { enabled: true, channels: [] };
                if (aiConf.enabled && aiConf.channels.includes(message.channel.id)) {
                    message.channel.sendTyping().catch(() => { });
                    client.ai.generateResponse(message.author.id, message.content).then(response => {
                        if (response) message.reply({ content: response, allowedMentions: { parse: ['users'], repliedUser: false } }).catch(() => { });
                    }).catch(() => { });
                }
                return;
            }
        }

        const contentAfterPrefix = isMention ? message.content.replace(mentionRegex, '').trim() : message.content.slice(finalUsedPrefix.length).trim();
        const finalArgs = contentAfterPrefix.split(/ +/);
        const finalCmd = finalArgs.shift().toLowerCase();

        const command = client.commands.get(finalCmd) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(finalCmd));
        if (!command) return;

        // --- Ignore Logic Check (Regular Commands) ---
        if (isIgnored && command.name !== 'afk') return;

        // Security Checks for REGULAR PATH
        if (command.ownerOnly && !isOwner) {
            const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} This command is **owner-only**.`);
            return message.reply({ components: msg, flags: KyraUI.getFlags() });
        }

        if (client.maintenanceMode && !isOwner) {
            const maintenanceContainer = KyraUI.buildSimpleMessage(`⚙️ **Under Maintenance**\n\nSorry for the inconvenience! **Kyra X** is undergoing regular maintenance.`);
            return message.reply({ components: maintenanceContainer, flags: KyraUI.getFlags() });
        }

        if (command.permissions && command.permissions.length > 0) {
            const missingPerms = command.permissions.filter(perm => !message.member?.permissions.has(perm));
            if (missingPerms.length > 0 && !isOwner) {
                const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You do not have permission to use this command.`);
                return message.reply({ components: msg, flags: KyraUI.getFlags() });
            }
        }

        try {
            await command.execute({ client, message, args: finalArgs, prefix: finalUsedPrefix });
            client.emit('commandUsed', { client, message, commandName: command.name, args: finalArgs }, client);
        } catch (error) {
            client.logger.error('MessageCreate', `Error executing command: ${finalCmd}`, error);
        }
    }
};
