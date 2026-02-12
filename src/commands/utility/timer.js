import { KyraUI } from '#classes/KyraUI';
import { Timer } from '#src/database/index.js';

export default {
    name: 'timer',
    description: 'Sets a simple timer (up to 7 days)',
    slash: true,
    options: [
        { name: 'time', description: 'Time for the timer (e.g. 30s, 10m, 1h, 2d)', type: 3, required: true }
    ],
    async execute({ client, message, interaction, args }) {
        const isSlash = !!interaction;
        const user = isSlash ? interaction.user : message.author;

        const timeInput = isSlash ? interaction.options.getString('time') : args[0];

        if (!timeInput) {
            const errorContainer = KyraUI.buildSimpleMessage('Please provide a time (e.g., 30s, 10m, 1h, 2d).');
            const errorData = { components: errorContainer, flags: KyraUI.getFlags(true) };
            return isSlash ? interaction.reply(errorData) : message.reply(errorData).catch(() => { });
        }

        // Parse: s for seconds, m for minutes, h for hours, d for days
        let durationMs = 0;
        const match = timeInput.match(/^(\d+)([smhd])$/i);

        if (!match) {
            const errorContainer = KyraUI.buildSimpleMessage('Invalid format. Use `30s`, `10m`, `1h`, or `2d`.');
            const errorData = { components: errorContainer, flags: KyraUI.getFlags(true) };
            return isSlash ? interaction.reply(errorData) : message.reply(errorData).catch(() => { });
        }

        const value = parseInt(match[1]);
        const unit = match[2].toLowerCase();

        if (unit === 's') durationMs = value * 1000;
        else if (unit === 'm') durationMs = value * 60 * 1000;
        else if (unit === 'h') durationMs = value * 60 * 60 * 1000;
        else if (unit === 'd') durationMs = value * 24 * 60 * 60 * 1000;

        if (durationMs > 7 * 24 * 60 * 60 * 1000) {
            const errorContainer = KyraUI.buildSimpleMessage('Timer cannot exceed 7 days.');
            const errorData = { components: errorContainer, flags: KyraUI.getFlags(true) };
            return isSlash ? interaction.reply(errorData) : message.reply(errorData).catch(() => { });
        }

        const endTime = Date.now() + durationMs;
        const endTimestamp = Math.floor(endTime / 1000);

        // Save to Database
        const timerDoc = await Timer.create({
            userId: user.id,
            channelId: isSlash ? interaction.channelId : message.channel.id,
            message: 'Timer',
            duration: durationMs,
            expiresAt: new Date(endTime),
            completed: false
        });

        const container = KyraUI.buildDashboard(
            `### ⏲️ **Timer Set**`,
            `I've set a timer for **${timeInput}**.\n\n` +
            `${client.config.emojis.dot} **Ends:** <t:${endTimestamp}:R>\n` +
            `${client.config.emojis.dot} *I'll notify you when the time is up.*`
        );

        const responseData = { components: container, flags: KyraUI.getFlags() };
        if (isSlash) {
            await interaction.reply(responseData);
        } else {
            await message.reply(responseData).catch(() => { });
        }

        setTimeout(async () => {
            // Check if still pending before sending (in case of restart handling) but for new ones just send

            // Mark as completed
            await Timer.updateOne({ _id: timerDoc._id }, { completed: true });

            const alertContent = `${client.config.emojis.success} **Timer Up!** <@${user.id}>, your **${timeInput}** timer has finished.`;
            const channel = isSlash ? interaction.channel : message.channel;
            await channel.send({ content: alertContent }).catch(() => { });
        }, durationMs);
    }
};
