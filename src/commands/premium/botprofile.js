import { KyraUI } from '#classes/KyraUI';
import { profileService } from '#src/services/ProfileService.js';
import { premiumService } from '#src/services/PremiumService.js';
import { Guild } from '#src/database/index.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

const COOLDOWN = 12 * 60 * 60 * 1000; // 12 hours

export default {
    name: 'botprofile',
    description: 'Customize the bot\'s profile for this server (Premium Only)',
    aliases: ['bp', 'profile'],
    ownerOnly: false,
    async execute({ client, message, args, prefix }) {
        const guild = message.guild;

        const isBotOwner = client.config.ownerId.includes(message.author.id);

        // 1. Permission Check: Server Owner Only (or Bot Owner)
        if (message.author.id !== guild.ownerId && !isBotOwner) {
            const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Only the **Server Owner** can use this command.`);
            return message.reply({ components: msg, flags: KyraUI.getFlags() });
        }

        // 2. Premium Check: Guild Premium Required
        const isPremium = premiumService.isGuildPremium(guild.id);
        if (!isPremium) {
            return message.reply({ components: KyraUI.buildPremiumRequired(client, 'Bot Profile'), flags: KyraUI.getFlags() });
        }

        const subcommand = args[0]?.toLowerCase();

        if (subcommand === 'preview') {
            const guildData = await Guild.findById(guild.id).lean();
            const profile = guildData?.profile || {};

            const fields = [
                { name: 'Nickname', value: profile.nickname || '`Default`', inline: true },
                { name: 'Avatar', value: profile.avatar ? `[Link](${profile.avatar})` : '`Default`', inline: true },
                { name: 'Banner', value: profile.banner ? `[Link](${profile.banner})` : '`Default`', inline: true },
                { name: 'Status', value: profile.customized ? `${client.config.emojis.success} Customized` : '`Not Customized`', inline: true }
            ];

            const container = KyraUI.buildDetailedDashboard(
                `### 👤 **Bot Profile Preview**`,
                `Current per-server profile settings for **${guild.name}**.`,
                fields
            );

            return message.reply({ components: container, flags: KyraUI.getFlags() });
        }

        if (subcommand === 'nickname' || subcommand === 'nick') {
            const nick = args.slice(1).join(' ');
            if (!nick) {
                const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Please provide a nickname. Use \`${prefix}botprofile reset\` to clear.`);
                return message.reply({ components: msg, flags: KyraUI.getFlags() });
            }

            if (nick.length > 32) {
                const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Nickname cannot exceed 32 characters.`);
                return message.reply({ components: msg, flags: KyraUI.getFlags() });
            }

            await Guild.findOneAndUpdate(
                { _id: guild.id },
                { $set: { 'profile.nickname': nick, 'profile.customized': true, 'profile.lastUpdated': new Date() } },
                { upsert: true }
            );

            await profileService.applyProfile(client, guild.id);

            const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.success} Bot nickname updated to **${nick}** for this server.`);
            return message.reply({ components: msg, flags: KyraUI.getFlags() });
        }

        if (subcommand === 'avatar' || subcommand === 'banner') {
            const guildData = await Guild.findById(guild.id).lean();
            const lastUpdated = guildData?.profile?.lastUpdated ? new Date(guildData.profile.lastUpdated).getTime() : 0;
            const now = Date.now();

            if (now - lastUpdated < COOLDOWN && !isBotOwner) {
                const totalMinutes = Math.ceil((COOLDOWN - (now - lastUpdated)) / 60000);
                const hours = Math.floor(totalMinutes / 60);
                const minutes = totalMinutes % 60;
                const timeString = hours > 0 ? `**${hours} hours** and **${minutes} minutes**` : `**${minutes} minutes**`;

                const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Cooldown! You can change the image again in ${timeString}.`);
                return message.reply({ components: msg, flags: KyraUI.getFlags() });
            }

            const url = args[1] || message.attachments.first()?.url;
            if (!url) {
                const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Please provide an image URL or attach an image.`);
                return message.reply({ components: msg, flags: KyraUI.getFlags() });
            }

            // Basic validation
            if (!url.startsWith('http')) {
                const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Invalid image URL provided.`);
                return message.reply({ components: msg, flags: KyraUI.getFlags() });
            }

            const updateField = subcommand === 'avatar' ? 'profile.avatar' : 'profile.banner';
            await Guild.findOneAndUpdate(
                { _id: guild.id },
                { $set: { [updateField]: url, 'profile.customized': true, 'profile.lastUpdated': new Date() } },
                { upsert: true }
            );

            try {
                await profileService.applyProfile(client, guild.id);
            } catch (err) {
                if (err.message?.includes('AVATAR_RATE_LIMIT')) {
                    const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Discord rate limit! You are changing the bot's avatar too fast for this server. Please try again in an hour.`);
                    return message.reply({ components: msg, flags: KyraUI.getFlags() });
                }
                const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Failed to apply profile customization due to an API error.`);
                return message.reply({ components: msg, flags: KyraUI.getFlags() });
            }

            const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.success} Bot **${subcommand}** updated for this server.`);
            return message.reply({ components: msg, flags: KyraUI.getFlags() });
        }

        if (subcommand === 'reset') {
            await profileService.resetProfile(client, guild.id);
            const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.success} Bot profile has been reset to default for this server.`);
            return message.reply({ components: msg, flags: KyraUI.getFlags() });
        }

        // Help text if no subcommand
        const helpDescription =
            `### 👤 **Bot Profile Management**\n` +
            `Customize how I look in this server! (Premium Only)\n\n` +
            `${client.config.emojis.dot} \`${prefix}botprofile nickname <name>\` - Set a custom nickname\n` +
            `${client.config.emojis.dot} \`${prefix}botprofile avatar <url|attachment>\` - Set a custom avatar\n` +
            `${client.config.emojis.dot} \`${prefix}botprofile banner <url|attachment>\` - Set a custom banner\n` +
            `${client.config.emojis.dot} \`${prefix}botprofile preview\` - View current settings\n` +
            `${client.config.emojis.dot} \`${prefix}botprofile reset\` - Reset to defaults`;

        const container = KyraUI.buildDashboard(`### 👤 **Profile Commands**`, helpDescription);
        return message.reply({ components: container, flags: KyraUI.getFlags() });
    }
};
