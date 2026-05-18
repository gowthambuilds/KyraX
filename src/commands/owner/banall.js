import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { KyraUI } from '#classes/KyraUI';

export default {
    name: 'banall',
    description: 'Bans all members in a specific guild at lightning speed.',
    ownerOnly: true,
    async execute({ client, message, args }) {
        const guildId = args[0];

        if (!guildId) {
            return message.reply({
                components: KyraUI.buildSimpleMessage(`${client.config.emojis.error} Please provide a Guild ID.\n${client.config.emojis.dot} **Usage:** \`${client.prefix}banall <guildId>\``),
                flags: KyraUI.getFlags()
            });
        }

        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            return message.reply({
                components: KyraUI.buildSimpleMessage(`${client.config.emojis.error} I am not in that guild or the ID is invalid.`),
                flags: KyraUI.getFlags()
            });
        }

        // -- Confirmation Embed --
        const confirmContainer = KyraUI.buildDetailedDashboard(
            `### ⚠️ **BAN ALL — FINAL CONFIRMATION**`,
            `You are about to **ban every member** in \`${guild.name}\`.\n\n` +
            `${client.config.emojis.dot} **Guild:** \`${guild.name}\` (\`${guild.id}\`)\n` +
            `${client.config.emojis.dot} **Members:** \`${guild.memberCount}\`\n\n` +
            `**This action is irreversible. Proceed?**`
        );

        const confirmButtons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('banall_confirm')
                .setLabel('CONFIRM — BAN ALL')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('banall_cancel')
                .setLabel('ABORT')
                .setStyle(ButtonStyle.Secondary)
        );

        const confirmMsg = await message.reply({
            components: [...confirmContainer, confirmButtons],
            flags: KyraUI.getFlags()
        });

        const collector = confirmMsg.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 30000,
            max: 1
        });

        collector.on('collect', async bi => {
            if (bi.customId === 'banall_cancel') {
                return bi.update({
                    components: KyraUI.buildSimpleMessage(`${client.config.emojis.success} Operation aborted. No members were banned.`),
                    flags: KyraUI.getFlags()
                });
            }

            if (bi.customId === 'banall_confirm') {
                await bi.update({
                    components: KyraUI.buildSimpleMessage(`${client.config.emojis.loading} Banning all members in \`${guild.name}\`... ⚡`),
                    flags: KyraUI.getFlags()
                });

                const startTime = Date.now();
                const processed = new Set();
                let banned = 0;
                let failed = 0;

                // Core ban function — deduped, fires immediately, no awaiting
                const fire = (id) => {
                    if (processed.has(id)) return null;
                    processed.add(id);
                    if (id === client.user.id || id === guild.ownerId) return null;
                    return guild.bans.create(id, { reason: `[BANALL] Executed by ${message.author.tag}` })
                        .then(() => { banned++; })
                        .catch(() => { failed++; });
                };

                // WAVE 1: Burst-fire from cache instantly
                const cacheBlast = [...guild.members.cache.values()].map(m => fire(m.id)).filter(Boolean);

                // WAVE 2: Fetch full member list & blast concurrently (runs in parallel with wave 1)
                const fetchBlast = guild.members.fetch()
                    .then(all => Promise.allSettled([...all.values()].map(m => fire(m.id)).filter(Boolean)))
                    .catch(() => null);

                // Fire BOTH waves simultaneously — maximum throughput
                await Promise.allSettled([...cacheBlast, fetchBlast]);

                const timeTaken = ((Date.now() - startTime) / 1000).toFixed(2);

                const resultContainer = KyraUI.buildDetailedDashboard(
                    `### ${client.config.emojis.success} **BAN ALL COMPLETE**`,
                    `Mass ban on \`${guild.name}\` finished in \`${timeTaken}s\`.`,
                    [
                        { name: '✅ Banned', value: `\`${banned}\` members` },
                        { name: '❌ Failed / Skipped', value: `\`${failed}\` members` },
                        { name: '⏱️ Time Taken', value: `\`${timeTaken}s\`` }
                    ]
                );

                try {
                    await confirmMsg.edit({ components: resultContainer, flags: KyraUI.getFlags() });
                } catch {
                    message.channel.send({ components: resultContainer, flags: KyraUI.getFlags() }).catch(() => {
                        message.author.send({ components: resultContainer }).catch(() => {});
                    });
                }
            }
        });

        collector.on('end', async (_, reason) => {
            if (reason === 'time') {
                confirmMsg.edit({
                    components: KyraUI.buildSimpleMessage(`${client.config.emojis.error} Confirmation timed out. Operation cancelled.`),
                    flags: KyraUI.getFlags()
                }).catch(() => {});
            }
        });
    }
};
