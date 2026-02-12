import { KyraUI } from '#classes/KyraUI';
import { PermissionFlagsBits } from 'discord.js';
import { Infraction } from '#src/database/index.js';

export default {
    name: 'delwarn',
    description: 'Deletes a specific warning by Case ID',
    slash: true,
    options: [
        { name: 'case_id', description: 'The Case ID to delete', type: 4, required: true }
    ],
    async execute({ client, message, interaction, args }) {
        const isSlash = !!interaction;
        if (isSlash) await interaction.deferReply({ flags: KyraUI.getFlags() });

        const executor = isSlash ? interaction.member : message.member;
        const guild = isSlash ? interaction.guild : message.guild;

        // 1. Resolve Case ID
        const caseId = isSlash ? interaction.options.getInteger('case_id') : parseInt(args[0]);

        if (isNaN(caseId)) {
            return KyraUI.sendUsage({ client, message, interaction }, isSlash ? '/delwarn case_id: <id>' : `${client.prefix}delwarn <case_id>`);
        }

        // 2. Permission Checks
        if (!executor.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You need **Moderate Members** permissions.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        // 3. Action
        const infraction = await Infraction.findOneAndDelete({ guildId: guild.id, caseId: caseId, type: 'warn' });

        if (!infraction) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} No warning found with Case ID **#${caseId}**.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        const successContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.success} Warning **#${caseId}** has been deleted.`);
        return isSlash ? interaction.editReply({ components: successContainer, flags: KyraUI.getFlags() }) : message.reply({ components: successContainer, flags: KyraUI.getFlags() });
    }
};

