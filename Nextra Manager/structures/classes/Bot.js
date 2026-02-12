import { Client, GatewayIntentBits, Collection, Partials } from 'discord.js';
import { config } from '#config/config';
import { logger } from '#utils/logger';
import { LocalDB } from '#data/StorageManager';
import { CommandHandler } from '#handlers/CommandHandler';
import { EventHandler } from '#handlers/EventLoader';

export class Bot extends Client {
    constructor() {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
            ],
            partials: [Partials.Channel, Partials.GuildMember, Partials.Message, Partials.User],
        });

        this.commands = new Collection();
        this.config = config;
        this.logger = logger;
        this.db = new LocalDB();

        this.commandHandler = new CommandHandler(this);
        this.eventHandler = new EventHandler(this);
    }

    async init() {
        this.logger.info('Bot', `Initializing ${this.config.bot.name}...`);
        try {
            await this.eventHandler.loadEvents();
            await this.commandHandler.loadCommands();

            await this.login(process.env.DISCORD_TOKEN);
            this.logger.success('Bot', 'Bot is online!');
        } catch (error) {
            this.logger.error('Bot', 'Initialization failed', error);
            throw error;
        }
    }
}
