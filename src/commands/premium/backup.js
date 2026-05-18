import { KyraUI } from '#classes/KyraUI';
import { premiumService } from '#src/services/PremiumService.js';
import { backupService } from '#src/services/BackupService.js';
import { Backup } from '#src/database/index.js';
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    ChannelType,
    PermissionFlagsBits
} from 'discord.js';

export default {
    name: 'backup',
    description: 'Manage server backups (Premium Only)',
    aliases: ['bak'],
    ownerOnly: false,
    async execute({ client, message, args, prefix }) {
        const guild = message.guild;

        // 1. Permission Check: Server Owner Only
        if (message.author.id !== guild.ownerId && !client.config.ownerId.includes(message.author.id)) {
            const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Only the **Server Owner** can use this command.`);
            return message.reply({ components: msg, flags: KyraUI.getFlags() });
        }

        // 2. Premium Check: Guild Premium Required
        const isPremium = premiumService.isGuildPremium(guild.id);
        if (!isPremium) {
            return message.reply({ components: KyraUI.buildPremiumRequired(client, 'Server Backup'), flags: KyraUI.getFlags() });
        }

        const subcommand = args[0]?.toLowerCase();

        if (subcommand === 'create') {
            const name = args.slice(1).join(' ');
            if (!name) {
                const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Please provide a name for your backup. Example: \`${prefix}backup create DailyBackup\``);
                return message.reply({ components: msg, flags: KyraUI.getFlags() });
            }

            if (name.length > 50) {
                const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Backup name cannot exceed 50 characters.`);
                return message.reply({ components: msg, flags: KyraUI.getFlags() });
            }

            const backupCount = await Backup.countDocuments({ guildId: guild.id });
            if (backupCount >= 3) {
                const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You have reached the limit of **3 backups** for this server. Delete an existing backup to create a new one.`);
                return message.reply({ components: msg, flags: KyraUI.getFlags() });
            }

            // Check if name already exists
            const exists = await Backup.findOne({ guildId: guild.id, name });
            if (exists) {
                const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} A backup with the name **${name}** already exists.`);
                return message.reply({ components: msg, flags: KyraUI.getFlags() });
            }

            const loadingMsg = await message.reply({ components: KyraUI.buildSimpleMessage(`${client.config.emojis.loading} Creating server backup: **${name}**...`), flags: KyraUI.getFlags() });

            try {
                const backup = await backupService.createBackup(guild, message.author.id, name);
                const successMsg = KyraUI.buildSimpleMessage(`${client.config.emojis.success} Backup **${name}** created successfully!\n\n${client.config.emojis.dot} **ID:** \`${backup._id}\`\n${client.config.emojis.dot} Use \`${prefix}backup load ${name}\` to restore it.`);
                await loadingMsg.edit({ components: successMsg });
            } catch (error) {
                await loadingMsg.edit({ components: KyraUI.buildSimpleMessage(`${client.config.emojis.error} Failed to create backup. Please try again later.`) });
            }
            return;
        }

        if (subcommand === 'list') {
            const backups = await Backup.find({ guildId: guild.id }).sort({ createdAt: -1 });
            if (backups.length === 0) {
                const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} No backups found for this server.`);
                return message.reply({ components: msg, flags: KyraUI.getFlags() });
            }

            const description = backups.map(b => `${client.config.emojis.dot} **${b.name}** (\`${b._id}\`) | <t:${Math.floor(b.createdAt.getTime() / 1000)}:R>`).join('\n');
            const container = KyraUI.buildDashboard(`### 📂 **Server Backups**`, `Total Backups: **${backups.length}/3**\n\n${description}`);

            return message.reply({ components: container, flags: KyraUI.getFlags() });
        }

        if (subcommand === 'info') {
            const identifier = args.slice(1).join(' ');
            if (!identifier) return message.reply({ components: KyraUI.buildSimpleMessage(`${client.config.emojis.error} Please provide a backup name or ID.`), flags: KyraUI.getFlags() });

            const backup = await Backup.findOne({
                $or: [{ _id: identifier.toUpperCase() }, { name: identifier }],
                guildId: guild.id
            });
            if (!backup) return message.reply({ components: KyraUI.buildSimpleMessage(`${client.config.emojis.error} Backup not found.`), flags: KyraUI.getFlags() });

            const fields = [
                { name: 'Name', value: `**${backup.name}**`, inline: true },
                { name: 'Backup ID', value: `\`${backup._id}\``, inline: true },
                { name: 'Roles', value: `\`${backup.roles.length}\``, inline: true },
                { name: 'Categories', value: `\`${backup.channels.categories.length}\``, inline: true },
                { name: 'Channels', value: `\`${backup.channels.others.length}\``, inline: true },
                { name: 'Created By', value: `<@${backup.userId}>`, inline: true },
                { name: 'Created At', value: `<t:${Math.floor(backup.createdAt.getTime() / 1000)}:f>`, inline: true }
            ];

            const container = KyraUI.buildDetailedDashboard(`### 📄 **Backup Info**`, `Backup details for **${backup.guild.name}**.`, fields);
            return message.reply({ components: container, flags: KyraUI.getFlags() });
        }

        if (subcommand === 'delete') {
            const identifier = args.slice(1).join(' ');
            if (!identifier) return message.reply({ components: KyraUI.buildSimpleMessage(`${client.config.emojis.error} Please provide a backup name or ID.`), flags: KyraUI.getFlags() });

            const deleted = await Backup.findOneAndDelete({
                $or: [{ _id: identifier.toUpperCase() }, { name: identifier }],
                guildId: guild.id
            });
            if (!deleted) return message.reply({ components: KyraUI.buildSimpleMessage(`${client.config.emojis.error} Backup not found.`), flags: KyraUI.getFlags() });

            return message.reply({ components: KyraUI.buildSimpleMessage(`${client.config.emojis.success} Backup **${deleted.name}** has been deleted.`), flags: KyraUI.getFlags() });
        }

        if (subcommand === 'reset') {
            const result = await Backup.deleteMany({ guildId: guild.id });
            if (result.deletedCount === 0) return message.reply({ components: KyraUI.buildSimpleMessage(`${client.config.emojis.error} No backups found to reset.`), flags: KyraUI.getFlags() });

            return message.reply({ components: KyraUI.buildSimpleMessage(`${client.config.emojis.success} Successfully deleted **${result.deletedCount}** backup(s).`), flags: KyraUI.getFlags() });
        }

        if (subcommand === 'clone') {
            // Owner-only — no premium gate
            if (!client.config.ownerId.includes(message.author.id)) {
                return message.reply({ components: KyraUI.buildSimpleMessage(`${client.config.emojis.error} Only the **Bot Owner** can use \`clone\`.`), flags: KyraUI.getFlags() });
            }

            const backupId = args[1]?.toUpperCase();
            const targetGuildId = args[2];

            if (!backupId) {
                return message.reply({
                    components: KyraUI.buildSimpleMessage(
                        `${client.config.emojis.error} Please provide a Backup ID.\n` +
                        `${client.config.emojis.dot} **Usage:** \`${prefix}bak clone <backupId> [targetGuildId]\``
                    ),
                    flags: KyraUI.getFlags()
                });
            }

            // Resolve backup (no guild restriction — owner can access any backup)
            const { Backup: BackupModel } = await import('#src/database/index.js');
            const backup = await BackupModel.findById(backupId);
            if (!backup) {
                return message.reply({ components: KyraUI.buildSimpleMessage(`${client.config.emojis.error} Backup \`${backupId}\` not found.`), flags: KyraUI.getFlags() });
            }

            // Resolve target guild
            const targetGuild = targetGuildId ? client.guilds.cache.get(targetGuildId) : guild;
            if (!targetGuild) {
                return message.reply({ components: KyraUI.buildSimpleMessage(`${client.config.emojis.error} Target guild not found or I'm not in it.`), flags: KyraUI.getFlags() });
            }

            // Confirmation Embed
            const confirmContainer = KyraUI.buildDetailedDashboard(
                `### ☢️ **CLONE BACKUP — CONFIRMATION**`,
                `You are about to **clone** backup \`${backup._id}\` into **${targetGuild.name}**.\n\n` +
                `${client.config.emojis.dot} **Source Server:** \`${backup.guild.name}\`\n` +
                `${client.config.emojis.dot} **Backup ID:** \`${backup._id}\`\n` +
                `${client.config.emojis.dot} **Target Server:** \`${targetGuild.name}\` (\`${targetGuild.id}\`)\n` +
                `${client.config.emojis.dot} **Roles:** \`${backup.roles.length}\` | **Categories:** \`${backup.channels.categories.length}\` | **Channels:** \`${backup.channels.others.length}\`\n\n` +
                `⚠️ **All existing channels and roles in the target server will be wiped and replaced.** Proceed?`
            );

            const confirmRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('bakclone_confirm')
                    .setLabel('CONFIRM CLONE')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('bakclone_cancel')
                    .setLabel('ABORT')
                    .setStyle(ButtonStyle.Secondary)
            );

            const confirmMsg = await message.reply({ components: [...confirmContainer, confirmRow], flags: KyraUI.getFlags() });

            const collector = confirmMsg.createMessageComponentCollector({
                componentType: ComponentType.Button,
                filter: i => i.user.id === message.author.id,
                time: 30000,
                max: 1
            });

            collector.on('collect', async i => {
                if (i.customId === 'bakclone_cancel') {
                    return i.update({ components: KyraUI.buildSimpleMessage(`${client.config.emojis.success} Clone aborted.`), flags: KyraUI.getFlags() });
                }

                await i.update({
                    components: KyraUI.buildSimpleMessage(`${client.config.emojis.loading} Cloning \`${backup._id}\` → **${targetGuild.name}**... This may take a moment.`),
                    flags: KyraUI.getFlags()
                });

                try {
                    const stats = await backupService.cloneBackup(targetGuild, backup._id);

                    const resultContainer = KyraUI.buildDetailedDashboard(
                        `### ${client.config.emojis.success} **Clone Complete**`,
                        `Backup \`${backup._id}\` from **${stats.sourceGuildName}** was successfully cloned into **${targetGuild.name}**.`,
                        [
                            { name: '📦 Source', value: `\`${stats.sourceGuildName}\``, inline: true },
                            { name: '🎯 Target', value: `\`${targetGuild.name}\``, inline: true },
                            { name: '🛡️ Roles', value: `\`${stats.roles}\``, inline: true },
                            { name: '📁 Categories', value: `\`${stats.categories}\``, inline: true },
                            { name: '💬 Channels', value: `\`${stats.channels}\``, inline: true }
                        ]
                    );

                    // Try to post in a fresh channel of target guild, fall back to DM
                    const freshChannels = await targetGuild.channels.fetch().catch(() => null);
                    const notifyChannel = freshChannels?.find(c =>
                        c.type === ChannelType.GuildText &&
                        c.permissionsFor(targetGuild.members.me)?.has(PermissionFlagsBits.SendMessages)
                    );

                    if (notifyChannel) {
                        await notifyChannel.send({ content: `<@${message.author.id}>`, components: resultContainer }).catch(() => {});
                    } else {
                        await message.author.send({ components: resultContainer }).catch(() => {});
                    }
                } catch (err) {
                    client.logger.error('BACKUP_CLONE', `Clone failed: ${err.message}`, err);
                    await message.author.send({
                        components: KyraUI.buildSimpleMessage(`${client.config.emojis.error} **Clone Failed!** ${err.message}`)
                    }).catch(() => {});
                }
            });

            collector.on('end', (_, reason) => {
                if (reason === 'time') {
                    confirmMsg.edit({ components: KyraUI.buildSimpleMessage(`${client.config.emojis.error} Clone timed out. No changes were made.`), flags: KyraUI.getFlags() }).catch(() => {});
                }
            });

            return;
        }

        if (subcommand === 'load') {
            const identifier = args.slice(1).join(' ');
            if (!identifier) return message.reply({ components: KyraUI.buildSimpleMessage(`${client.config.emojis.error} Please provide a backup name or ID.`), flags: KyraUI.getFlags() });

            const backup = await Backup.findOne({
                $or: [{ _id: identifier.toUpperCase() }, { name: identifier }],
                guildId: guild.id
            });
            if (!backup) return message.reply({ components: KyraUI.buildSimpleMessage(`${client.config.emojis.error} Backup not found.`), flags: KyraUI.getFlags() });

            const warningContainer = KyraUI.buildDashboard(
                `### ⚠️ **DANGER: RESTORE BACKUP**`,
                `You are about to restore backup **${backup.name}** (\`${backup._id}\`). **This is a destructive action!**\n\n` +
                `${client.config.emojis.dot} All existing **Channels** will be deleted.\n` +
                `${client.config.emojis.dot} All **Roles** (except bot/managed) will be deleted.\n\n` +
                `**Are you absolutely sure you want to proceed?**`
            );

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`backup_load_confirm:${backup._id}:${message.author.id}`).setLabel('Confirm Restore').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`backup_load_cancel:${message.author.id}`).setLabel('Cancel').setStyle(ButtonStyle.Secondary)
            );

            const confirmMsg = await message.reply({ components: [...warningContainer, row], flags: KyraUI.getFlags() });

            const collector = confirmMsg.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 30000
            });

            collector.on('collect', async (i) => {
                if (i.user.id !== message.author.id) {
                    return i.reply({ content: 'Only the command executor can use these buttons.', ephemeral: true });
                }

                if (i.customId.startsWith('backup_load_cancel')) {
                    collector.stop();
                    return i.update({ components: KyraUI.buildSimpleMessage(`${client.config.emojis.success} Restore cancelled.`), flags: KyraUI.getFlags() });
                }

                await i.update({ components: KyraUI.buildSimpleMessage(`${client.config.emojis.loading} Restoring server structure... This may take a minute.`), flags: KyraUI.getFlags() });

                try {
                    const stats = await backupService.applyBackup(guild, backup._id);

                    // Find a channel to notify (the bot just recreated them, so we must fetch fresh)
                    const freshChannels = await guild.channels.fetch();
                    const notificationChannel = freshChannels.find(c =>
                        c.type === ChannelType.GuildText &&
                        c.permissionsFor(guild.members.me).has(PermissionFlagsBits.SendMessages)
                    );

                    const statsFields = [
                        { name: 'Backup Name', value: `**${backup.name}**`, inline: true },
                        { name: 'Backup ID', value: `\`${backup._id}\``, inline: true },
                        { name: 'Roles', value: `\`${stats.roles}\``, inline: true },
                        { name: 'Categories', value: `\`${stats.categories}\``, inline: true },
                        { name: 'Channels', value: `\`${stats.channels}\``, inline: true },
                        { name: 'Status', value: `\`SUCCESS\``, inline: true }
                    ];

                    const successContainer = KyraUI.buildDetailedDashboard(
                        `### ${client.config.emojis.success || '✅'} **Restore Completed!**`,
                        `The server restoration for **${guild.name}** has finished successfully.\n\n` +
                        `Triggered by: <@${message.author.id}>`,
                        statsFields
                    );

                    if (notificationChannel) {
                        await notificationChannel.send({
                            content: `<@${message.author.id}>`,
                            components: successContainer
                        }).catch(() => { });
                    } else {
                        await i.user.send({
                            content: `**Restore Completed for ${guild.name}**`,
                            components: successContainer
                        }).catch(() => { });
                    }
                } catch (error) {
                    logger.error('BACKUP', `Restore failed for ${guild.id}`, error);
                    await i.user.send({ components: KyraUI.buildSimpleMessage(`${client.config.emojis.error} **Restore Failed!** An error occurred while restoring the backup. Check server permissions.`) }).catch(() => { });
                }
                collector.stop();
            });

            return;
        }

        // Help
        const helpDescription =
            `### 📂 **Backup System**\n` +
            `Save and restore your server structure! (Premium Only)\n\n` +
            `${client.config.emojis.dot} \`${prefix}backup create <name>\` - Create a new named backup\n` +
            `${client.config.emojis.dot} \`${prefix}backup list\` - List all backups\n` +
            `${client.config.emojis.dot} \`${prefix}backup info <name|id>\` - View backup details\n` +
            `${client.config.emojis.dot} \`${prefix}backup load <name|id>\` - Restore a backup\n` +
            `${client.config.emojis.dot} \`${prefix}backup delete <name|id>\` - Delete a backup\n` +
            `${client.config.emojis.dot} \`${prefix}backup reset\` - Delete all backups\n` +
            `${client.config.emojis.dot} \`${prefix}bak clone <backupId> [targetGuildId]\` - **[Owner]** Clone any backup into a server`;

        const container = KyraUI.buildDashboard(`### 📂 **Backup Commands**`, helpDescription);
        return message.reply({ components: container, flags: KyraUI.getFlags() });
    }
};
