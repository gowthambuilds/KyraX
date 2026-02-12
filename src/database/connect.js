import mongoose from 'mongoose';
import chalk from 'chalk';

const connectDB = async () => {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI is not defined in the environment variables.');
        }

        mongoose.connection.on('connected', () => {
            console.log(chalk.green('✓ [DATABASE] Connected to MongoDB'));
        });

        mongoose.connection.on('error', (err) => {
            console.error(chalk.red('✗ [DATABASE] MongoDB connection error:'), err);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn(chalk.yellow('! [DATABASE] MongoDB disconnected'));
        });

        await mongoose.connect(process.env.MONGO_URI);

    } catch (error) {
        console.error(chalk.red('✗ [DATABASE] Failed to connect to MongoDB:'), error);
        process.exit(1);
    }
};

export default connectDB;
