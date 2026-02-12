import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, PermissionFlagsBits } from 'discord.js';
import { KyraUI } from '#classes/KyraUI';
import { Pagination } from '#src/utils/Pagination.js';

export default {
    name: 'list',
    description: 'Lists various server entities (admins, bots, emojis, roles, boosters, inrole)',
    slash: true,
    options: [
        {
            name: 'admins',
            description: 'List all administrators in the server',
            type: 1
        },
        {
            name: 'bots',
            description: 'List all bots in the server',
            type: 1
        },
        {
            name: 'emojis',
            description: 'List all custom emojis in the server',
            type: 1
        },
        {
            name: 'roles',
            description: 'List all roles in the server',
            type: 1
        },
        {
            name: 'boosters',
            description: 'List all current server boosters',
            type: 1
        },
        {
            name: 'inrole',
            description: 'List all members with a specific role',
            type: 1,
            options: [
                {
                    name: 'role',
                    description: 'The role to list members for',
                    type: 8,
                    required: true
                }
            ]
        }
    ],
    async execute({ client, message, interaction, args }) {
        const isSlash = !!interaction;
        const sub = isSlash ? interaction.options.getSubcommand() : args[0]?.toLowerCase();
        const guild = isSlash ? interaction.guild : message.guild;

        if (!sub) {
            const usage = `**Usage:** \`list <admins|bots|emojis|roles|boosters|inrole>\`\n` +
                `**Example:** \`list admins\``;
            const container = KyraUI.buildDashboard(`### ${client.config.emojis.error} **Invalid Usage**`, usage);
            const res = { components: container, flags: KyraUI.getFlags(true) };
            return isSlash ? interaction.reply(res) : message.reply(res);
        }

        let title = '';
        let items = [];

        // Efficient Member Fetching Helper
        const fetchMembers = async () => {
            // If cache is reasonably populated (>90% of memberCount), skip fetch
            if (guild.members.cache.size >= guild.memberCount * 0.9) return guild.members.cache;

            try {
                return await guild.members.fetch();
            } catch (err) {
                console.error('[LIST ERROR] Member fetch failed:', err);
                return guild.members.cache;
            }
        };

        switch (sub) {
            case 'admins': {
                const members = await fetchMembers();
                const admins = members.filter(m => m.permissions.has(PermissionFlagsBits.Administrator) && !m.user.bot);
                title = `🛡️ Server Administrators (${admins.size})`;
                items = admins.map(m => `${client.config.emojis.dot} <@${m.id}> (\`${m.id}\`)`);
                break;
            }

            case 'bots': {
                const members = await fetchMembers();
                const bots = members.filter(m => m.user.bot);
                title = `🤖 Server Bots (${bots.size})`;
                items = bots.map(m => `${client.config.emojis.dot} <@${m.id}> (\`${m.id}\`)`);
                break;
            }

            case 'emojis': {
                const emojis = guild.emojis.cache;
                title = `✨ Server Emojis (${emojis.size})`;
                items = emojis.map(e => `${client.config.emojis.dot} emoji - ${e.toString()} (\`${e.id}\`)`);
                break;
            }

            case 'roles': {
                const roles = guild.roles.cache.sort((a, b) => b.position - a.position).filter(r => r.id !== guild.id);
                title = `🏷️ Server Roles (${roles.size})`;
                items = roles.map(r => `${client.config.emojis.dot} <@&${r.id}> (\`${r.id}\`)`);
                break;
            }

            case 'boosters': {
                const members = await fetchMembers();
                const boosters = members.filter(m => m.premiumSince);
                title = `💎 Server Boosters (${boosters.size})`;
                items = boosters.map(m => `${client.config.emojis.dot} <@${m.id}> - <t:${Math.floor(m.premiumSinceTimestamp / 1000)}:R>`);
                break;
            }

            case 'inrole': {
                const role = isSlash
                    ? interaction.options.getRole('role')
                    : message.mentions.roles.first() || guild.roles.cache.get(args[1]);

                if (!role) {
                    const errContent = `Please provide a valid role ID or mention.`;
                    const container = KyraUI.buildDashboard(`### ${client.config.emojis.error} **Role Error**`, errContent);
                    const res = { components: container, flags: KyraUI.getFlags(true) };
                    return isSlash ? interaction.reply(res) : message.reply(res);
                }

                // Optimization: Fetch only members with this role
                let members;
                try {
                    members = await guild.members.fetch({ role: role.id });
                } catch (err) {
                    members = guild.members.cache.filter(m => m.roles.cache.has(role.id));
                }

                title = `👥 Members with Role: <@&${role.id}> (${members.size})`;
                items = members.map(m => `${client.config.emojis.dot} <@${m.id}> (\`${m.id}\`)`);
                break;
            }

            default: {
                const errContent = `Unknown subcommand. Use \`admins\`, \`bots\`, \`emojis\`, \`roles\`, \`boosters\`, or \`inrole\`.`;
                const container = KyraUI.buildDashboard(`### ${client.config.emojis.error} **Subcommand Error**`, errContent);
                const res = { components: container, flags: KyraUI.getFlags(true) };
                return isSlash ? interaction.reply(res) : message.reply(res);
            }
        }

        return Pagination.create({
            client,
            interaction,
            message,
            title,
            items,
            itemsPerPage: 15
        });
    }
};
