import { KyraUI } from '#classes/KyraUI';
import { PermissionFlagsBits } from 'discord.js';

export default {
    name: 'purge',
    description: 'Deletes a specified number of messages from the channel with optional filters',
    slash: true,
    permissions: [PermissionFlagsBits.ManageMessages],
    options: [
        { name: 'amount', description: 'Number of messages to delete (1-1000) or "all"', type: 3, required: true },
        { 
            name: 'filter', 
            description: 'Filter messages by type', 
            type: 3, 
            required: false,
            choices: [
                { name: 'Humans Only', value: 'humans' },
                { name: 'Bots Only', value: 'bots' },
                { name: 'Embeds Only', value: 'embeds' },
                { name: 'Files Only', value: 'files' },
                { name: 'Links Only', value: 'links' },
                { name: 'Images Only', value: 'images' }
            ]
        },
        { name: 'user', description: 'Only delete messages from this specific user', type: 6, required: false }
    ],
    async execute({ client, message, interaction, args }) {
        const isSlash = !!interaction;
        if (isSlash) await interaction.deferReply({ flags: KyraUI.getFlags() });
        let inputAmount = isSlash ? interaction.options.getString('amount') : args[0];
        let filter = isSlash ? interaction.options.getString('filter') : args[1]?.toLowerCase();
        const targetUser = isSlash ? interaction.options.getUser('user') : message.mentions.users.first();

        // Handle prefix format: purge <filter> <count> [user]
        const validFilters = ['humans', 'bots', 'embeds', 'files', 'links', 'images'];
        if (!isSlash && inputAmount && validFilters.includes(inputAmount.toLowerCase())) {
            filter = inputAmount.toLowerCase();
            inputAmount = args[1];
        }

        const executor = isSlash ? interaction.member : message.member;
        const guild = isSlash ? interaction.guild : message.guild;
        const channel = isSlash ? interaction.channel : message.channel;

        // Show help if no arguments provided (prefix command only)
        if (!isSlash && !inputAmount) {
            return KyraUI.sendUsage({ client, message, interaction }, `${client.prefix}purge [filter] <amount|all> [user]`);
        }

        let amount;
        if (inputAmount?.toLowerCase() === 'all') {
            amount = 1000; // Cap "all" at 1000 for safety
        } else {
            amount = parseInt(inputAmount);
            if (isNaN(amount) || amount < 1 || amount > 1000) {
                const examples = isSlash ? '/purge amount: <1-1000|all> [filter] [user]' : `${client.prefix}purge [humans|bots|embeds|files|links|images] <1-1000|all> [user]`;
                return KyraUI.sendUsage({ client, message, interaction }, examples);
            }
        }

        // Permission Checks
        if (!executor.permissions.has(PermissionFlagsBits.ManageMessages)) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You need **Manage Messages** permissions.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        if (!channel.permissionsFor(client.user).has(PermissionFlagsBits.ManageMessages)) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} I need **Manage Messages** permissions.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        try {
            // Delete trigger message for prefix commands early to exclude from fetch/count
            if (!isSlash) message.delete().catch(() => { });

            // SNAPPY START: Show loading or reply early if possible
            const loadingMsg = isSlash ? null : await channel.send({ components: KyraUI.buildSimpleMessage(`${client.config.emojis.loading} Purging messages...`), flags: KyraUI.getFlags() });
            if (isSlash) await interaction.editReply({ components: KyraUI.buildSimpleMessage(`${client.config.emojis.loading} Purging messages...`) });

            let deletedCount = 0;
            let fetchedCount = 0;
            let lastMessageId = null;

            while (deletedCount < amount && fetchedCount < 1000) {
                const fetchOptions = { limit: 100 };
                if (lastMessageId) fetchOptions.before = lastMessageId;

                const messages = await channel.messages.fetch(fetchOptions);
                if (messages.size === 0) break;
                fetchedCount += messages.size;
                lastMessageId = messages.last().id;

                let toDelete = messages.filter(m => {
                    const ageInDays = (Date.now() - m.createdTimestamp) / (1000 * 60 * 60 * 24);
                    if (ageInDays > 14) return false; // bulkDelete limit
                    
                    // User filter
                    if (targetUser && m.author.id !== targetUser.id) return false;
                    
                    // Logic filter
                    if (filter) {
                        switch (filter) {
                            case 'humans': return !m.author.bot;
                            case 'bots': return m.author.bot;
                            case 'embeds': return m.embeds.length > 0;
                            case 'files': return m.attachments.size > 0;
                            case 'links': return /https?:\/\//.test(m.content);
                            case 'images': return m.attachments.some(a => a.contentType?.startsWith('image/')) || m.embeds.some(e => e.image || e.thumbnail);
                            default: return true;
                        }
                    }
                    return true;
                });

                toDelete = Array.from(toDelete.values()).slice(0, amount - deletedCount);

                if (toDelete.length > 0) {
                    const deleted = await channel.bulkDelete(toDelete, true).catch(() => new Map());
                    deletedCount += deleted.size;
                    if (deleted.size < toDelete.length) break; // Hit 14-day limit
                }

                if (messages.size < 100) break;
            }

            // Background Logging
            const { modLogger } = await import('#utils/modLogger');
            modLogger.log(client, {
                guild,
                user: targetUser || { id: 'N/A', tag: filter ? `Filter: ${filter}` : 'Multiple Users' },
                moderator: executor.user,
                type: 'purge',
                reason: `Purged ${deletedCount} messages in #${channel.name}${targetUser ? ` from ${targetUser.tag}` : ''}${filter ? ` [Filter: ${filter}]` : ''}`
            }).catch(() => { });

            if (isSlash) {
                await interaction.editReply({ components: KyraUI.buildSimpleMessage(`${client.config.emojis.success} Successfully purged **${deletedCount}** messages.`) });
                setTimeout(() => interaction.deleteReply().catch(() => { }), 5000);
            } else {
                if (loadingMsg) await loadingMsg.edit({ components: KyraUI.buildSimpleMessage(`${client.config.emojis.success} Successfully purged **${deletedCount}** messages.`) });
                setTimeout(() => loadingMsg?.delete().catch(() => { }), 5000);
            }

        } catch (error) {
            client.logger.error('Purge', 'Failed to purge messages', error);
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} An error occurred while trying to purge messages.`);
            try {
                if (isSlash) await interaction.editReply({ components: errorContainer });
                else await channel.send({ components: errorContainer, flags: KyraUI.getFlags() });
            } catch (replyError) {
                client.logger.error('Purge', 'Failed to send error message', replyError);
            }
        }
    }
};

