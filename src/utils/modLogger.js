import { PermissionFlagsBits } from 'discord.js';
import { Guild, Infraction } from '#src/database/index.js';
import { KyraUI } from '#classes/KyraUI';

export const modLogger = {
    async log(client, { guild, user, moderator, type, reason, duration = null }) {
        // --- ULTRAFAST: Fire and Forget Logging ---
        (async () => {
            try {
                // 1. Get guild settings and update case count
                const guildData = await Guild.findOneAndUpdate(
                    { _id: guild.id },
                    { $inc: { 'moderation.caseCount': 1 } },
                    { new: true, upsert: true, lean: true }
                );

                const caseId = guildData.moderation.caseCount;

                // 2. Create infraction record
                await Infraction.create({
                    guildId: guild.id,
                    userId: user.id,
                    moderatorId: moderator.id,
                    type,
                    reason,
                    caseId,
                    timestamp: new Date()
                });

                // 3. DM the user (if enabled and user is valid)
                if (guildData.moderation?.dmOnAction && typeof user.send === 'function') {
                    const actionPhrasing = type.endsWith('n') ? `${type}ned` : type.endsWith('e') ? `${type}d` : `${type}ed`;
                    const dmContainer = KyraUI.buildDashboard(
                        `### 🛡️ **Action: ${type.toUpperCase()}**`,
                        `You have been **${actionPhrasing}** in **${guild.name}**.\n\n` +
                        `${client.config.emojis.dot} **Moderator:** <@${moderator.id}>\n` +
                        `${client.config.emojis.dot} **Reason:** ${reason}` +
                        (duration ? `\n${client.config.emojis.dot} **Duration:** ${duration}` : '')
                    );
                    await user.send({ components: dmContainer, flags: KyraUI.getFlags() }).catch(() => { });
                }

                // 4. Send to log channel
                const logChannelId = guildData.moderation?.logChannel;
                if (logChannelId) {
                    const logChannel = await guild.channels.fetch(logChannelId).catch(() => null);
                    if (logChannel && logChannel.permissionsFor(client.user).has(PermissionFlagsBits.SendMessages)) {
                        const logFields = [
                            { name: 'User', value: `${user.tag} (\`${user.id}\`)` },
                            { name: 'Moderator', value: `${moderator.tag} (\`${moderator.id}\`)` },
                            { name: 'Reason', value: reason }
                        ];
                        if (duration) logFields.push({ name: 'Duration', value: duration });

                        const logContainer = KyraUI.buildDetailedDashboard(
                            `Case #${caseId} | ${type.toUpperCase()}`,
                            null,
                            logFields
                        );

                        await logChannel.send({
                            components: logContainer,
                            flags: KyraUI.getFlags(),
                            allowedMentions: { parse: [] }
                        }).catch(() => { });
                    }
                }
            } catch (error) {
                client.logger.error('MOD_LOGGER', `Background logging failed`, error);
            }
        })();

        return true; // We don't bother returning Case IDs anymore to save speed
    }
};
