import { KyraUI } from '#classes/KyraUI';
import { PermissionFlagsBits } from 'discord.js';

export default {
    name: 'purge',
    description: 'Deletes a specified number of messages from the channel',
    slash: true,
    options: [
        { name: 'amount', description: 'Number of messages to delete (1-1000) or "all"', type: 3, required: true },
        { name: 'user', description: 'Only delete messages from this user', type: 6, required: false }
    ],
    async execute({ client, message, interaction, args }) {
        const isSlash = !!interaction;
        if (isSlash) await interaction.deferReply({ flags: KyraUI.getFlags() });
        const inputAmount = isSlash ? interaction.options.getString('amount') : args[0];
        const targetUser = isSlash ? interaction.options.getUser('user') : message.mentions.users.first();

        const executor = isSlash ? interaction.member : message.member;
        const guild = isSlash ? interaction.guild : message.guild;
        const channel = isSlash ? interaction.channel : message.channel;

        // Show help if no arguments provided (prefix command only)
        if (!isSlash && !inputAmount) {
            return KyraUI.sendUsage({ client, message, interaction }, `${client.prefix}purge <amount|all> [user]`);
        }

        let amount;
        if (inputAmount.toLowerCase() === 'all') {
            amount = 1000; // Cap "all" at 1000 for safety
        } else {
            amount = parseInt(inputAmount);
            if (isNaN(amount) || amount < 1 || amount > 1000) {
                return KyraUI.sendUsage({ client, message, interaction }, isSlash ? '/purge amount: <1-1000|all> [user: user]' : `${client.prefix}purge <1-1000|all> [user]`);
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

            // Background Logging
            const { modLogger } = await import('#utils/modLogger');
            modLogger.log(client, {
                guild,
                user: targetUser || { id: 'N/A', tag: 'Multiple Users' },
                moderator: executor.user,
                type: 'purge',
                reason: `Purged ${inputAmount} messages in #${channel.name}${targetUser ? ` from ${targetUser.tag}` : ''}`
            }).catch(() => { });

            // SNAPPY START: Show loading or reply early if possible
            if (isSlash) await interaction.editReply({ components: KyraUI.buildSimpleMessage(`${client.config.emojis.loading} Purging messages...`) });
            else {
                const initMsg = await channel.send({ components: KyraUI.buildSimpleMessage(`${client.config.emojis.loading} Purging messages...`), flags: KyraUI.getFlags() });
                setTimeout(() => initMsg.delete().catch(() => { }), 2000);
            }

            let deletedCount = 0;
            let remaining = amount;
            let lastMessageId = null;

            // Efficiency: Fetch and delete in parallel batches if possible, 
            // but bulkDelete has strict limits. We loop efficiently.
            while (remaining > 0) {
                const fetchOptions = { limit: Math.min(remaining, 100) };
                if (lastMessageId) fetchOptions.before = lastMessageId;

                const messages = await channel.messages.fetch(fetchOptions);
                if (messages.size === 0) break;
                lastMessageId = messages.last().id;

                let toDelete = targetUser
                    ? messages.filter(m => m.author.id === targetUser.id)
                    : messages;

                toDelete = Array.from(toDelete.values()).slice(0, remaining);

                if (toDelete.length > 0) {
                    const deleted = await channel.bulkDelete(toDelete, true).catch(() => new Map());
                    deletedCount += deleted.size;

                    // If we are filtering by user, we need to keep fetching until we hit 'remaining' 
                    // or run out of messages. If we aren't filtering, we can just subtract deleted size.
                    if (!targetUser) remaining -= deleted.size;
                    else {
                        // If we are filtering, we basically continue until we've deleted 'amount'
                        // total or hit the end of the channel.
                        if (deletedCount >= amount) break;
                    }

                    if (deleted.size < toDelete.length) break; // Hit 14-day limit
                }

                if (messages.size < 100 && !targetUser) break;
                if (messages.size < 100 && targetUser && deletedCount < amount) {
                    // if searching for a user, we might need to continue if there are more messages 
                    // but we just hit the end of this fetch.
                }
            }

            // Silent completion
            if (isSlash) {
                await interaction.deleteReply().catch(() => { });
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

