import { KyraUI } from '#classes/KyraUI';
import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize } from 'discord.js';

export default {
    name: 'nodestatus',
    description: 'Displays detailed statistics of Lavalink nodes (Owner Only).',
    aliases: ['ns', 'lavalink'],
    ownerOnly: true,
    async execute({ client, message, prefix }) {
        if (!client.config.ownerId.includes(message.author.id)) {
            return message.channel.send({
                content: `${client.config.emojis.error} You are not authorized to use this command.`,
                flags: KyraUI.getFlags()
            });
        }

        const nodes = client.lavalink.kazagumo.shoukaku.nodes;
        if (!nodes || nodes.size === 0) {
            return message.channel.send(`${client.config.emojis.error} No Lavalink nodes connected.`);
        }

        const formatBytes = (bytes) => {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };

        const formatUptime = (ms) => {
            const seconds = Math.floor((ms / 1000) % 60);
            const minutes = Math.floor((ms / (1000 * 60)) % 60);
            const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
            const days = Math.floor(ms / (1000 * 60 * 60 * 24));

            const parts = [];
            if (days > 0) parts.push(`${days}d`);
            if (hours > 0) parts.push(`${hours}h`);
            if (minutes > 0) parts.push(`${minutes}m`);
            if (seconds > 0) parts.push(`${seconds}s`);
            return parts.join(' ') || '0s';
        };


        const container = new ContainerBuilder();

        // Header
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## ${client.config.emojis.status || '📡'} **Lavalink Cluster Status**`)
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
                .setSpacing(SeparatorSpacingSize.Small)
                .setDivider(true)
        );

        let totalPlayers = 0;
        let totalPlayingPlayers = 0;

        const nodeEntries = Array.from(nodes.values());

        // Total Stats Calculation
        nodeEntries.forEach(node => {
            if (node.stats) {
                totalPlayers += node.stats.players;
                totalPlayingPlayers += node.stats.playingPlayers;
            }
        });

        if (nodes.size > 1) {
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `### 📊 **Total Cluster Stats**\n` +
                    `${client.config.emojis.dot} **Nodes Active:** \`${nodes.size}\`\n` +
                    `${client.config.emojis.dot} **Total Players:** \`${totalPlayingPlayers}\` playing / \`${totalPlayers}\` total`
                )
            );

            container.addSeparatorComponents(
                new SeparatorBuilder()
                    .setSpacing(SeparatorSpacingSize.Small)
                    .setDivider(true)
            );
        }

        // Node Details
        nodeEntries.forEach((node, index) => {
            const { stats } = node;
            const status = node.state === 1 ? '🟢 Connected' : '🔴 Disconnected';

            let content = '';
            const nodeNameDisplay = node.name.includes('(Primary)') ? `🌟 **${node.name}**` : (node.name.includes('(Secondary)') ? `🛡️ **${node.name}**` : `🛰️ **${node.name}**`);

            if (!stats) {
                content = `### ${nodeNameDisplay}\n${client.config.emojis.error} **Status:** Disconnected or inactive.\n*No statistics available.*`;
            } else {
                const memUsed = stats.memory.used;
                const memTotal = stats.memory.reservable;
                const cpuLoad = stats.cpu.lavalinkLoad;
                const memPercent = Math.round((memUsed / memTotal) * 100) || 0;
                const cpuPercent = Math.round(cpuLoad * 100) || 0;

                content = `### ${nodeNameDisplay}\n` +
                    `${client.config.emojis.dot} **Status:** ${status}\n` +
                    `${client.config.emojis.dot} **Uptime:** \`${formatUptime(stats.uptime)}\`\n` +
                    `${client.config.emojis.dot} **Players:** \`${stats.playingPlayers}\` active / \`${stats.players}\` total\n\n` +
                    `${client.config.emojis.dot} **CPU Load:** \`${cpuPercent}%\` (\`${stats.cpu.cores} Cores\`)\n` +
                    `${client.config.emojis.dot} **Memory:** \`${formatBytes(memUsed)}\` / \`${formatBytes(memTotal)}\` (\`${memPercent}%\`)`;
            }

            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));

            // Add separator between nodes, but not after the last one
            if (index < nodeEntries.length - 1) {
                container.addSeparatorComponents(
                    new SeparatorBuilder()
                        .setSpacing(SeparatorSpacingSize.Small)
                        .setDivider(true)
                );
            }
        });

        return message.channel.send({ components: [container], flags: KyraUI.getFlags() });
    }
};
