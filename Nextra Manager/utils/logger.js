import chalk from 'chalk';

const getTime = () => {
    return new Date().toLocaleString('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true
    });
};

export const logger = {
    info: (source, message) => {
        console.log(`${chalk.gray(getTime())} ${chalk.blue('ℹ')} [${chalk.blue(source)}] ${message}`);
    },
    success: (source, message) => {
        console.log(`${chalk.gray(getTime())} ${chalk.green('✔')} [${chalk.green(source)}] ${message}`);
    },
    warn: (source, message) => {
        console.log(`${chalk.gray(getTime())} ${chalk.yellow('⚠')} [${chalk.yellow(source)}] ${message}`);
    },
    error: (source, message, err) => {
        console.log(`${chalk.gray(getTime())} ${chalk.red('✖')} [${chalk.red(source)}] ${message}`);
        if (err) console.error(err);
    },
    debug: (source, message) => {
        if (process.env.DEBUG) {
            console.log(`${chalk.gray(getTime())} ${chalk.magenta('⚙')} [${chalk.magenta(source)}] ${message}`);
        }
    }
};
