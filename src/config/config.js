import 'dotenv/config';
import emojis from './emoji.js';

export const config = {
    token: process.env.TOKEN,
    clientId: process.env.CLIENT_ID,
    ownerId: process.env.OWNER_IDS ? process.env.OWNER_IDS.split(',') : [process.env.OWNER_ID],
    openRouterKey: process.env.OPENROUTER_KEY,
    bot: {
        name: 'Kyra X',
        prefix: process.env.PREFIX || '+',
        color: '#FFFFFF',
        website: 'https://www.nextraforge.xyz',
        supportServer: 'https://discord.gg/kn5tX5TcKN',
        logs: {
            premium: '1466407042716799209',
            guilds: '1467125258455744603'
        }
    },
    colors: {
        primary: '#5865F2',
        success: '#57F287',
        error: '#ED4245',
        warning: '#FEE75C'
    },
    nodes: [
        {
            name: 'Airanode (Primary)',
            url: 'lava.airanode.cloud:25714',
            auth: 'AnXCodeX',
            secure: false
        },
        {
            name: 'Public Lavalink v4.2 (Secondary)',
            url: 'lavalinkv4.serenetia.com:443',
            auth: 'https://dsc.gg/ajidevserver',
            secure: true
        }
    ],
    spotify: {
        clientId: process.env.SPOTIFY_CLIENT_ID,
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET
    },
    emojis
};
