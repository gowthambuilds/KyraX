import { KyraUI } from '#classes/KyraUI';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';
import { Poll } from '#src/database/index.js';

export default {
    name: 'poll',
    description: 'Create an advanced interactive poll',
    slash: false,
    options: [
        { name: 'question', description: 'The question to ask', type: 3, required: true },
        { name: 'options', description: 'Options separated by comma (e.g., Yes, No, Maybe)', type: 3, required: true }
    ],
    async execute({ client, message, interaction, args, prefix }) {
        const isSlash = false; // Forced to false
        const guild = message.guild;
        const executor = message.member;

        if (!executor.permissions.has(PermissionFlagsBits.ManageMessages)) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You need **Manage Messages** permissions to create polls.`);
            return message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        const fullContent = args.join(' ');

        // Better parsing: find first comma or Pipe symbol
        const separatorIndex = fullContent.search(/[,|]/);

        if (!fullContent || separatorIndex === -1) {
            const usageContainer = KyraUI.buildDetailedDashboard(
                `${client.config.emojis.utility} **Poll Command Usage**`,
                `Create interactive polls with up to 5 options.`,
                [
                    { name: 'Syntax', value: `\`${prefix}poll <question> | <opt1>, <opt2>, ...\`` },
                    { name: 'Alternative', value: `\`${prefix}poll <question> <opt1>, <opt2>, ...\`` },
                    { name: 'Example', value: `\`${prefix}poll favorite food? | Pizza, Burger, Pasta\`` }
                ]
            );
            return message.reply({ components: usageContainer, flags: KyraUI.getFlags() });
        }

        let question, optionsRaw;

        // If pipe is used, it's the definitive separator
        if (fullContent.includes('|')) {
            [question, optionsRaw] = fullContent.split('|').map(s => s.trim());
        } else {
            // Find the last space before the first comma
            const firstCommaPos = fullContent.indexOf(',');
            const spaceBeforeComma = fullContent.lastIndexOf(' ', firstCommaPos);

            if (spaceBeforeComma === -1) {
                question = fullContent.substring(0, firstCommaPos).trim();
                optionsRaw = fullContent.substring(firstCommaPos).trim();
            } else {
                question = fullContent.substring(0, spaceBeforeComma).trim();
                optionsRaw = fullContent.substring(spaceBeforeComma).trim();
            }
        }

        const optionsArray = optionsRaw.split(',').map(o => o.trim()).filter(o => o.length > 0);

        if (optionsArray.length < 2 || optionsArray.length > 5) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Please provide between **2** and **5** options.`);
            return message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        const fields = optionsArray.map((opt, index) => ({
            name: `Option ${index + 1}`,
            value: `${opt}\n${client.config.emojis.dot} **Votes:** 0 (0%)`
        }));

        const container = KyraUI.buildDetailedDashboard(
            `### 📊 **New Poll**`,
            `**${question}**`,
            fields
        );

        const buttons = new ActionRowBuilder().addComponents(
            optionsArray.slice(0, 5).map((opt, index) => (
                new ButtonBuilder()
                    .setCustomId(`poll_vote_${index}`)
                    .setLabel(opt.substring(0, 80)) // Button labels have 80 char limit
                    .setStyle(ButtonStyle.Secondary)
            ))
        );

        const pollMsg = await message.reply({
            components: [...container, buttons],
            flags: KyraUI.getFlags()
        });

        // Save to DB
        await Poll.create({
            guildId: guild.id,
            channelId: pollMsg.channelId,
            messageId: pollMsg.id,
            question,
            options: optionsArray.map(label => ({ label, votes: [] }))
        });
    }
};

