import { KyraUI } from '#classes/KyraUI';
import { PermissionFlagsBits } from 'discord.js';

export default {
    name: 'roleall',
    description: 'Mass role management for humans, bots, or everyone',
    aliases: ['ra', 'roleremoveall'],
    slash: true,
    options: [
        {
            name: 'add',
            description: 'Add a role to a group of members',
            type: 1,
            options: [
                {
                    name: 'target',
                    description: 'The group of members to target',
                    type: 3,
                    required: true,
                    choices: [
                        { name: 'Humans', value: 'humans' },
                        { name: 'Bots', value: 'bots' },
                        { name: 'All', value: 'all' }
                    ]
                },
                { name: 'role', description: 'The role to add', type: 8, required: true }
            ]
        },
        {
            name: 'remove',
            description: 'Remove a role from a group of members',
            type: 1,
            options: [
                {
                    name: 'target',
                    description: 'The group of members to target',
                    type: 3,
                    required: true,
                    choices: [
                        { name: 'Humans', value: 'humans' },
                        { name: 'Bots', value: 'bots' },
                        { name: 'All', value: 'all' }
                    ]
                },
                { name: 'role', description: 'The role to remove', type: 8, required: true }
            ]
        }
    ],
    async execute({ client, message, interaction, args }) {
        const isSlash = !!interaction;
        if (isSlash) await interaction.deferReply({ flags: KyraUI.getFlags() });
        const guild = isSlash ? interaction.guild : message.guild;
        const executor = isSlash ? interaction.member : message.member;

        if (!executor.permissions.has(PermissionFlagsBits.ManageRoles)) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You need **Manage Roles** permissions.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} I need **Manage Roles** permissions.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        const subcommand = isSlash ? interaction.options.getSubcommand() :
            (message.content.includes('roleremoveall') ? 'remove' : args[0]?.toLowerCase());

        const targetType = isSlash ? interaction.options.getString('target') : (isSlash ? null : args[1]?.toLowerCase());
        const role = isSlash ? interaction.options.getRole('role') : (isSlash ? null : message.mentions.roles.first() || guild.roles.cache.get(args[2]));

        if (!['add', 'remove'].includes(subcommand) || !['humans', 'bots', 'all'].includes(targetType) || !role) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Invalid usage.\nEx: \`roleall add humans @role\` or \`/roleall remove target: Bots role: @role\``);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        // Permission check for high roles
        if (role.position >= guild.members.me.roles.highest.position) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} I cannot manage this role as it is higher than or equal to my highest role.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        if (role.position >= executor.roles.highest.position && guild.ownerId !== executor.id) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You cannot manage this role as it is higher than or equal to your highest role.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.reply({ components: errorContainer, flags: KyraUI.getFlags() });
        }

        // Defer if slash
        // Defer if slash
        if (isSlash && !interaction.deferred && !interaction.replied) {
            // Already deferred at the top
        } else if (!isSlash) {
            const loadingMsg = await message.reply({ components: KyraUI.buildSimpleMessage(`${client.config.emojis.loading} Processing mass role update...`), flags: KyraUI.getFlags() });
            message.loadingMsg = loadingMsg;
        }

        try {
            await guild.members.fetch();
            let members = guild.members.cache;

            if (targetType === 'humans') members = members.filter(m => !m.user.bot);
            else if (targetType === 'bots') members = members.filter(m => m.user.bot);

            if (subcommand === 'add') members = members.filter(m => !m.roles.cache.has(role.id));
            else members = members.filter(m => m.roles.cache.has(role.id));

            const total = members.size;
            if (total === 0) {
                const infoContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} No members found who need this role change.`);
                return isSlash ? interaction.editReply({ components: infoContainer }) : message.loadingMsg.edit({ components: infoContainer, flags: KyraUI.getFlags() });
            }

            let successCount = 0;
            let failCount = 0;

            // Note: Batching here 
            const memberArray = Array.from(members.values());
            const batchSize = 10;

            for (let i = 0; i < memberArray.length; i += batchSize) {
                const batch = memberArray.slice(i, i + batchSize);
                await Promise.all(batch.map(async (m) => {
                    try {
                        if (subcommand === 'add') await m.roles.add(role, `Mass role update by ${executor.user.tag}`);
                        else await m.roles.remove(role, `Mass role update by ${executor.user.tag}`);
                        successCount++;
                    } catch (e) {
                        failCount++;
                    }
                }));
                // Small delay between batches to avoid immediate rate limit
                if (i + batchSize < memberArray.length) await new Promise(r => setTimeout(r, 1000));
            }

            const successContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.success} Mass role update complete.\n${client.config.emojis.dot} **Success:** \`${successCount}\`\n${client.config.emojis.dot} **Failed:** \`${failCount}\``);
            return isSlash ? interaction.editReply({ components: successContainer }) : message.loadingMsg.edit({ components: successContainer, flags: KyraUI.getFlags() });

        } catch (error) {
            client.logger.error('RoleAll', 'Failed mass role update', error);
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} An error occurred during the mass role update.`);
            return isSlash ? interaction.editReply({ components: errorContainer }) : message.loadingMsg.edit({ components: errorContainer, flags: KyraUI.getFlags() });
        }
    }
};

