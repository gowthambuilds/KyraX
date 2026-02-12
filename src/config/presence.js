import { ActivityType } from 'discord.js';

export const presenceConfig = {
    interval: 15000, // 15 seconds
    activities: [
        {
            text: 'Under Development',
            type: ActivityType.Watching
        },
        {
            text: 'Serving {users} users from {guilds} servers',
            type: ActivityType.Watching
        }
    ]
};
