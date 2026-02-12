import 'dotenv/config';
import { Bot } from '#classes/Bot';
import { logger } from '#utils/logger';

const client = new Bot();

process.on('unhandledRejection', (reason) => {
    logger.error('Process', 'Unhandled Rejection', reason);
});

process.on('uncaughtException', (error) => {
    logger.error('Process', 'Uncaught Exception', error);
});

client.init();

export { client };
