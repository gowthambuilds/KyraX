import { KyraUI } from '#classes/KyraUI';
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ContainerBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize
} from 'discord.js';
import { Guild } from '#src/database/index.js';

export default {
    name: 'help',
    description: 'View all available commands and bot information',
    aliases: ['h'],
    slash: false,
    async execute({ client, message, interaction }) {
        const isSlash = !!interaction;
        const isSelectMenu = interaction?.isStringSelectMenu();
        const guildId = interaction?.guildId || message?.guildId;

        const guildData = await Guild.findById(guildId);
        const guildPrefix = guildData?.prefix || client.config.bot.prefix;

        // Security & Expiry Checks for Interactions
        const isHelpInteraction = interaction && (interaction.isStringSelectMenu() || interaction.isButton()) &&
            (interaction.customId.startsWith('help_category') || interaction.customId.startsWith('help_button'));

        if (isHelpInteraction) {
            const [, authorId] = interaction.customId.split(':');

            // 1. User Restriction
            if (interaction.user.id !== authorId) {
                const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.error || '❌'} This help menu wasn't requested by you! Run \`${guildPrefix}help\` to get your own.`);
                return interaction.reply({ components: msg, flags: 64 });
            }

            // 2. Timeout Check (3 Minutes)
            const created = interaction.message.createdTimestamp;
            if (Date.now() - created > 180000) {
                const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.error || '❌'} This help menu has expired. Please run \`${guildPrefix}help\` again.`);
                return interaction.reply({ components: msg, flags: 64 });
            }
        }

        const categories = {
            home: {
                title: `### 📚 **Help Center (v1.6)**`,
                description: `### ${client.config.emojis.news || '<a:news:1468148930008186913>'} **What's New**\n` +
                    `${client.config.emojis.dot} **Pro Token System:** Detailed claim history and safety confirmations!\n` +
                    `${client.config.emojis.dot} **Token Info:** Check token duration/uses without claiming.\n` +
                    `${client.config.emojis.dot} **Profiles:** Customize bot name, avatar, and banner per-server.\n\n` +
                    `### ⭐ **Star Feature**\n` +
                    `${client.config.emojis.dot} **Audit Logs:** Bot owners can now track exactly who claimed which token and in which guild!\n\n` +
                    `**Stats**\n` +
                    `${client.config.emojis.dot} **Servers:** \`${client.guilds.cache.size.toLocaleString()}\`\n` +
                    `${client.config.emojis.dot} **Users:** \`${client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0).toLocaleString()}\`\n` +
                    `${client.config.emojis.dot} **Commands:** \`${client.commands.size}\`\n\n` +
                    `${client.config.emojis.dot} **Web Dashboard Coming Soon!**`
            },
            admin: {
                title: `### ⚙️ **Admin Module**`,
                description: `Server configuration and automation settings.\n\n` +
                    `${client.config.emojis.dot} \`${guildPrefix}greet\`: \`setup\`, \`toggle\`, \`test\`, \`config\`, \`edit\`\n` +
                    `${client.config.emojis.dot} \`${guildPrefix}quickgreet\`: \`add\`, \`remove\`, \`list\`, \`reset\`, \`test\`\n` +
                    `${client.config.emojis.dot} \`${guildPrefix}autoreact\`: \`add\`, \`remove\`, \`list\`, \`reset\`\n` +
                    `${client.config.emojis.dot} \`${guildPrefix}autoresponder\`: \`add\`, \`remove\`, \`list\`, \`reset\``
            },
            voice: {
                title: `### 🎙️ **Voice Module**`,
                description: `Manage temporary voice channels with an interactive control panel.\n\n` +
                    `${client.config.emojis.dot} \`${guildPrefix}tempvc\`: \`panel\`, \`config\`\n` +
                    `*Usage: Use the control panel to setup, toggle, or manage your temp VC instantly!*`
            },
            utility: {
                title: `### ${client.config.emojis.utility} **Utility Module**`,
                description: `High-efficiency tools for server management and user interaction.\n\n` +
                    `${client.config.emojis.dot} \`${guildPrefix}userinfo\`, \`${guildPrefix}serverinfo\`, \`${guildPrefix}avatar\`, \`${guildPrefix}banner\`, \`${guildPrefix}roleinfo\`, \`${guildPrefix}stats\`\n` +
                    `${client.config.emojis.dot} \`${guildPrefix}servericon\`, \`${guildPrefix}serverbanner\`, \`${guildPrefix}nick\`, \`${guildPrefix}afk\`, \`${guildPrefix}prefix\`\n` +
                    `${client.config.emojis.dot} \`${guildPrefix}timer\`, \`${guildPrefix}snipe\`, \`${guildPrefix}ping\`, \`${guildPrefix}membercount\`, \`${guildPrefix}uptime\`, \`${guildPrefix}perms\`, \`${guildPrefix}embed\`\n` +
                    `${client.config.emojis.dot} \`${guildPrefix}logs\`: \`create\`, \`enable\`, \`disable\`, \`delete\`\n` +
                    `${client.config.emojis.dot} \`${guildPrefix}translate\`, \`${guildPrefix}poll\`, \`${guildPrefix}serverstats\`, \`${guildPrefix}lastping\`, \`${guildPrefix}users\`, \`${guildPrefix}support\`\n` +
                    `${client.config.emojis.dot} \`${guildPrefix}list admins\`, \`${guildPrefix}list bots\`, \`${guildPrefix}list emojis\`, \`${guildPrefix}list roles\`, \`${guildPrefix}list boosters\`, \`${guildPrefix}list inrole\``
            },
            moderation: {
                title: `### 🛡️ **Moderation Module (Ultrafast)**`,
                description: `High-performance safety tools with near-instant execution.\n\n` +
                    `${client.config.emojis.dot} \`${guildPrefix}ban\`, \`${guildPrefix}unban\`, \`${guildPrefix}kick\`, \`${guildPrefix}timeout\`, \`${guildPrefix}untimeout\`\n` +
                    `${client.config.emojis.dot} \`${guildPrefix}tempban\`, \`${guildPrefix}softban\`, \`${guildPrefix}unbanall\`\n` +
                    `${client.config.emojis.dot} \`${guildPrefix}role\`: \`@user @role\` (Toggle), \`create\`, \`delete\`\n` +
                    `${client.config.emojis.dot} \`${guildPrefix}roleall\`: \`add\`, \`remove\` \`target: <humans|bots|all>\` \`role: <role>\`\n` +
                    `${client.config.emojis.dot} \`${guildPrefix}autorole\`: \`add\`, \`remove\`, \`list\`, \`reset\`\n` +
                    `${client.config.emojis.dot} \`${guildPrefix}warn\`, \`${guildPrefix}warnings\`, \`${guildPrefix}delwarn\`, \`${guildPrefix}clearwarn\`\n` +
                    `${client.config.emojis.dot} \`${guildPrefix}purge\`, \`${guildPrefix}lock\`, \`${guildPrefix}unlock\`, \`${guildPrefix}slowmode\`, \`${guildPrefix}hide\`, \`${guildPrefix}unhide\`, \`${guildPrefix}nuke\`\n` +
                    `${client.config.emojis.dot} \`${guildPrefix}lockall\`, \`${guildPrefix}unlockall\`, \`${guildPrefix}hideall\`, \`${guildPrefix}unhideall\`\n` +
                    `${client.config.emojis.dot} \`${guildPrefix}vmute\`, \`${guildPrefix}vunmute\`, \`${guildPrefix}vdeafen\`, \`${guildPrefix}vundeafen\`, \`${guildPrefix}sticky\``
            },
            giveaway: {
                title: `### ${client.config.emojis.giveaway} **Giveaway Module**`,
                description: `Tools for hosting and managing server giveaways.\n\n` +
                    `${client.config.emojis.dot} \`${guildPrefix}gstart\`, \`${guildPrefix}gend\`, \`${guildPrefix}greroll\`\n` +
                    `${client.config.emojis.dot} \`${guildPrefix}gpause\`, \`${guildPrefix}gresume\``
            },
            music: {
                title: `### ${client.config.emojis.music || '🎵'} **Music Module**`,
                description: `High-fidelity music playback commands.\n\n` +
                    `${client.config.emojis.dot} \`${guildPrefix}play\`, \`${guildPrefix}stop\`, \`${guildPrefix}pause\`, \`${guildPrefix}resume\`, \`${guildPrefix}skip\`\n` +
                    `${client.config.emojis.dot} \`${guildPrefix}queue\`, \`${guildPrefix}volume\`, \`${guildPrefix}autoplay\`\n` +
                    `${client.config.emojis.dot} \`${guildPrefix}join\`, \`${guildPrefix}leave\`, \`${guildPrefix}nodestatus\` [Owner Only]`
            },
            ai: {
                title: `### 🤖 **AI Chat Module**`,
                description: `Elite AI integration for intelligent conversations.\n\n` +
                    `${client.config.emojis.dot} \`${guildPrefix}aichannel\`: \`add\`, \`remove\`, \`reset\`, \`enable\`, \`disable\`\n` +
                    `${client.config.emojis.dot} \`${guildPrefix}resetai\`: Clear your AI memory\n` +
                    `${client.config.emojis.dot} **Mention:** You can mention me (\`@${client.user.username} ping\`) to execute commands!`
            },
            premium: {
                title: `### ${client.config.emojis.premium} **Premium Module**`,
                description: `Elite features for boosted server management.\n\n` +
                    `${client.config.emojis.dot} \`${guildPrefix}botprofile\`: \`nick\`, \`avatar\`, \`banner\`, \`reset\`, \`preview\`\n` +
                    `${client.config.emojis.dot} \`${guildPrefix}backup\`: \`create\`, \`load\`, \`list\`, \`info\`, \`delete\`, \`reset\`\n` +
                    `${client.config.emojis.dot} \`${guildPrefix}premium claim\`: \`<code>\` (W/ Confirmation)\n` +
                    `${client.config.emojis.dot} \`${guildPrefix}premium info\`: \`<code>\` (Check token parameters)\n` +
                    `${client.config.emojis.dot} \`${guildPrefix}premium\`: \`add\`, \`gen\`, \`list\`, \`remove\`, \`reset\``
            }
        };

        const generateHelpResponse = (categoryId = 'home') => {
            const category = categories[categoryId] || categories.home;
            const container = new ContainerBuilder();
            const author = isSlash ? interaction.user : message.author;

            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(category.title));

            container.addSeparatorComponents(
                new SeparatorBuilder()
                    .setSpacing(SeparatorSpacingSize.Small)
                    .setDivider(true)
            );

            if (categoryId === 'home') {
                const headerSection = new SectionBuilder()
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(category.description))
                    .setThumbnailAccessory(
                        new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ size: 1024 }))
                    );
                container.addSectionComponents(headerSection);
            } else {
                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(category.description));
            }

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`help_category:${author.id}`)
                .setPlaceholder('Select a category...')
                .addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Home')
                        .setDescription('Back to main help page')
                        .setValue('home')
                        .setEmoji('📚'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Utility')
                        .setDescription('View all utility commands')
                        .setValue('utility')
                        .setEmoji(client.config.emojis.utility),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Moderation')
                        .setDescription('Comprehensive server safety tools')
                        .setValue('moderation')
                        .setEmoji('🛡️'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Voice')
                        .setDescription('Temporary voice channel management')
                        .setValue('voice')
                        .setEmoji('🎙️'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Giveaway')
                        .setDescription('View all giveaway commands')
                        .setValue('giveaway')
                        .setEmoji(client.config.emojis.giveaway),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Music')
                        .setDescription('High-fidelity music control')
                        .setValue('music')
                        .setEmoji(client.config.emojis.music || '🎵'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('AI Chat')
                        .setDescription('Elite AI intelligence features')
                        .setValue('ai')
                        .setEmoji('🤖'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Premium')
                        .setDescription('Elite features and enhancements')
                        .setValue('premium')
                        .setEmoji(client.config.emojis.premium),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Admin')
                        .setDescription('Server configuration and automation')
                        .setValue('admin')
                        .setEmoji('⚙️')
                );

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('Website')
                    .setURL(client.config.bot.website)
                    .setStyle(ButtonStyle.Link),
                new ButtonBuilder()
                    .setLabel('Support')
                    .setURL(client.config.bot.supportServer)
                    .setStyle(ButtonStyle.Link)
            );

            container.addActionRowComponents(new ActionRowBuilder().addComponents(selectMenu));
            container.addActionRowComponents(buttons);

            return { components: [container], flags: KyraUI.getFlags() };
        };

        // Execution Logic
        if (isSelectMenu) {
            const categoryId = interaction.values[0];
            if (interaction.replied || interaction.deferred) {
                return await interaction.editReply(generateHelpResponse(categoryId));
            }
            return await interaction.update(generateHelpResponse(categoryId));
        }

        // Initial Response (Prefix or Slash)
        const loadingContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.loading} **Loading Help Center...**`);
        let initialMsg;

        if (isSlash || isSelectMenu || (interaction && interaction.isButton())) {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ components: loadingContainer, flags: KyraUI.getFlags() });
            }
            return await interaction.editReply(generateHelpResponse('home'));
        } else {
            const initialMsg = await message.reply({ components: loadingContainer, flags: KyraUI.getFlags() });
            return await initialMsg.edit(generateHelpResponse('home'));
        }
    }
};
