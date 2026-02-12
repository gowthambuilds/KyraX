import 'dotenv/config';
import { Kyra } from '#classes/Kyra';
import { logger } from '#utils/logger';
import { connectDB } from './src/database/index.js';

const client = new Kyra();
await connectDB();

process.on('unhandledRejection', (reason) => {
    logger.error('Process', 'Unhandled Rejection', reason);
});

process.on('uncaughtException', (error) => {
    logger.error('Process', 'Uncaught Exception', error);
});

client.init();

export { client };
