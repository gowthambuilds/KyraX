import mongoose from 'mongoose';
import { KyraUI } from '#classes/KyraUI';

export default {
    name: 'dbstats',
    description: 'Displays MongoDB database statistics.',
    aliases: ['mongostats'],
    ownerOnly: true,
    async execute({ client, message, prefix }) {
        if (!client.config.ownerId.includes(message.author.id)) {
            return message.channel.send({
                content: `${client.config.emojis.error} You are not authorized to use this command.`,
                flags: KyraUI.getFlags()
            });
        }

        try {
            const db = mongoose.connection.db;

            // Get database stats
            const dbStats = await db.stats();

            // Get collection stats
            const collections = await db.listCollections().toArray();
            const collectionStats = [];

            for (const collection of collections) {
                const count = await db.collection(collection.name).countDocuments();
                collectionStats.push({
                    name: collection.name,
                    count: count
                });
            }

            // Format sizes
            const formatBytes = (bytes) => {
                if (bytes === 0) return '0 B';
                const k = 1024;
                const sizes = ['B', 'KB', 'MB', 'GB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
            };

            // Build collection details
            const collectionDetails = collectionStats
                .sort((a, b) => b.count - a.count)
                .map(col => `**${col.name}**: \`${col.count.toLocaleString()}\` documents`)
                .join('\n');

            // Connection state
            const connectionStates = {
                0: 'Disconnected',
                1: 'Connected',
                2: 'Connecting',
                3: 'Disconnecting'
            };

            const dashboard = KyraUI.buildDetailedDashboard(
                '📊 MongoDB Statistics',
                `**Database:** \`${dbStats.db}\`\n**Connection:** \`${connectionStates[mongoose.connection.readyState]}\`\n**Host:** \`${mongoose.connection.host}\``,
                [
                    {
                        name: '📈 Database Overview',
                        value: (() => {
                            // MongoDB Atlas Free Tier (M0) has 512 MB limit
                            const freetierLimit = 512 * 1024 * 1024; // 512 MB in bytes
                            const usedStorage = dbStats.storageSize || 0;
                            const usagePercent = ((usedStorage / freetierLimit) * 100).toFixed(2);
                            const availableStorage = freetierLimit - usedStorage;

                            return `${client.config.emojis.dot} Collections: \`${dbStats.collections}\`\n${client.config.emojis.dot} Data Size: \`${formatBytes(dbStats.dataSize)}\`\n${client.config.emojis.dot} Storage Used: \`${formatBytes(usedStorage)}\` (\`${usagePercent}%\`)\n${client.config.emojis.dot} Storage Available: \`${formatBytes(availableStorage)}\`\n${client.config.emojis.dot} Storage Limit: \`${formatBytes(freetierLimit)}\` (Free Tier)\n${client.config.emojis.dot} Indexes: \`${dbStats.indexes}\`\n${client.config.emojis.dot} Index Size: \`${formatBytes(dbStats.indexSize)}\``;
                        })()
                    },
                    {
                        name: '📚 Collections',
                        value: collectionDetails || 'No collections found.'
                    }
                ]
            );

            return message.channel.send({
                components: dashboard,
                flags: KyraUI.getFlags()
            });

        } catch (error) {
            console.error('Error fetching DB stats:', error);
            const errorMsg = KyraUI.buildSimpleMessage(
                `${client.config.emojis.error} **Failed to fetch database statistics**\n${client.config.emojis.dot} Error: \`${error.message}\``
            );
            return message.channel.send({
                components: errorMsg,
                flags: KyraUI.getFlags()
            });
        }
    }
};
