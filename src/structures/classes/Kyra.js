import { Client, GatewayIntentBits, Partials, Collection } from 'discord.js';
import { LavalinkManager } from '#classes/LavalinkManager';
import { config } from '#config/config';
import { logger } from '#utils/logger';
import { CommandHandler } from '#handlers/CommandHandler';
import { EventHandler } from '#handlers/EventHandler';

import { GiveawayManager } from '#utils/GiveawayManager';
import { AIHandler } from '#utils/AIHandler';
import { registerSlashCommands } from '#utils/slashRegistration';

export class Kyra extends Client {
    constructor() {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.GuildInvites,
                GatewayIntentBits.GuildPresences,
                GatewayIntentBits.GuildEmojisAndStickers,
                GatewayIntentBits.GuildModeration,
                GatewayIntentBits.GuildScheduledEvents,
                GatewayIntentBits.GuildWebhooks
            ],
            partials: [
                Partials.Channel,
                Partials.GuildMember,
                Partials.Message,
                Partials.User
            ],
            allowedMentions: {
                parse: ['users'],
                repliedUser: false
            }
        });

        this.config = config;
        this.logger = logger;
        this.commands = new Collection();

        this.commandHandler = new CommandHandler(this);
        this.eventHandler = new EventHandler(this);

        this.snipes = new Map();
        this.invites = new Collection(); // Map<guildId, Map<code, uses>>

        this.giveaways = new GiveawayManager(this);
        this.ai = new AIHandler(this);

        this.lavalink = new LavalinkManager(this);
        this.musicStats = {
            songsPlayed: 0
        };

        this.maintenanceMode = false; // Global maintenance mode flag
        this.prefix = config.bot.prefix;
    }

    async init() {
        this.logger.info('SYSTEM', 'Kernel initialization sequence initiated...');

        try {
            await this.eventHandler.loadEvents();
            await this.commandHandler.loadCommands();

            this.logger.info('AUTH', 'Requesting access to Discord Gateway...');
            await this.login(this.config.token);

            // Initialize Giveaways AFTER login so we can fetch channels
            await this.giveaways.init();

            // Register slash commands after login
            this.logger.info('SLASH', 'Synchronizing global interaction metadata...');
            await registerSlashCommands(this);

            // Load Global Stats
            const { BotStats } = await import('#src/database/index.js');
            const stats = await BotStats.findOneAndUpdate(
                { _id: 'global' },
                { $setOnInsert: { totalSongsPlayed: 0, maintenanceMode: false } },
                { upsert: true, new: true }
            );
            this.musicStats.totalSongsPlayed = stats.totalSongsPlayed || 0;
            this.maintenanceMode = stats.maintenanceMode || false;

            this.logger.success('Kyra X', 'Operational status: Fully functional (Core Engine Online)');
            this.logger.banner();
        } catch (error) {
            this.logger.error('CRITICAL', 'Engine failure during startup sequence', error);
            process.exit(1);
        }
    }
}
