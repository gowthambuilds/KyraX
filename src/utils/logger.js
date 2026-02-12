import chalk from 'chalk';

const gradientInfo = chalk.hex('#00BFFF');
const gradientSuccess = chalk.hex('#50C878');
const gradientWarn = chalk.hex('#FFBF00');
const gradientError = chalk.hex('#FF0033');

export const logger = {
    banner: () => {
        const text = `
    ██╗  ██╗██╗   ██╗██████╗  █████╗     ██╗  ██╗
    ██║ ██╔╝╚██╗ ██╔╝██╔══██╗██╔══██╗    ╚██╗██╔╝
    █████╔╝  ╚████╔╝ ██████╔╝███████║     ╚███╔╝ 
    ██╔═██╗   ╚██╔╝  ██╔══██╗██╔══██║     ██╔██╗ 
    ██║  ██╗   ██║   ██║  ██║██║  ██║    ██╔╝ ██╗
    ╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝    ╚═╝  ╚═╝\
        `;
        console.log(chalk.white.bold(text));
        console.log(chalk.gray('    ────────────────────────────────────────────────────\n'));
    },

    info: (source, message) => {
        console.log(`${gradientInfo(` ℹ `)} ${chalk.gray('(')}${gradientInfo(source)}${chalk.gray(')')} ${message}`);
    },

    debug: (source, message) => {
        console.log(`${chalk.gray(` ⚙ `)} ${chalk.gray('(')}${chalk.gray(source)}${chalk.gray(')')} ${chalk.gray(message)}`);
    },

    success: (source, message) => {
        console.log(`${gradientSuccess(` ✔ `)} ${chalk.gray('(')}${gradientSuccess(source)}${chalk.gray(')')} ${message}`);
    },

    warn: (source, message) => {
        console.log(`${gradientWarn(` ⚠ `)} ${chalk.gray('(')}${gradientWarn(source)}${chalk.gray(')')} ${message}`);
    },

    error: (source, message, error) => {
        console.log(`${gradientError(` ✖ `)} ${chalk.gray('(')}${gradientError(source)}${chalk.gray(')')} ${message}`);
        if (error) console.error(chalk.red(error.stack || error));
    },

    aiError: (userId, model, error) => {
        const border = chalk.gray('────────────────────────────────────────────────────');
        console.log(`\n${gradientError(` ✖ `)} ${chalk.white.bold('AI GENERATION ERROR')}`);
        console.log(border);
        console.log(`${gradientError(' User ID  :')} ${chalk.white(userId)}`);
        console.log(`${gradientError(' Model    :')} ${chalk.white(model)}`);
        console.log(`${gradientError(' Reason   :')} ${chalk.red(error.message || error)}`);
        console.log(border + '\n');
    }
};
