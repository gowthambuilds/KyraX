import {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} from 'discord.js';
import { config } from '#config/config';

export class KyraUI {
    /**
     * Get flags for Components v2 messages
     * @param {boolean} ephemeral 
     * @returns {number}
     */
    static getFlags(ephemeral = false) {
        let flags = MessageFlags.IsComponentsV2;
        if (ephemeral) flags |= MessageFlags.Ephemeral;
        return flags;
    }

    /**
     * Build a standard dashboard-style container
     * @param {string} content 
     * @returns {ContainerBuilder[]}
     */
    static buildSimpleMessage(content) {
        const container = new ContainerBuilder();

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(content)
        );

        return [container];
    }

    /**
     * Build a message with standard headings and separators
     * @param {string} title 
     * @param {string} description 
     * @returns {ContainerBuilder[]}
     */
    static buildDashboard(title, description) {
        const container = new ContainerBuilder();

        // Ensure title is a heading
        const formattedTitle = title.startsWith('#') ? title : `### ${title}`;

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(formattedTitle)
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
                .setSpacing(SeparatorSpacingSize.Small)
                .setDivider(true)
        );

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(description)
        );

        // Optional: Add a small spacer at the bottom for breathing room
        container.addSeparatorComponents(
            new SeparatorBuilder()
                .setSpacing(SeparatorSpacingSize.Small)
                .setDivider(false)
        );

        return [container];
    }
    /**
     * Build a highly detailed dashboard with fields and multiple separators
     * @param {string} title 
     * @param {string} description 
     * @param {Array<{name: string, value: string}>} fields 
     * @returns {ContainerBuilder[]}
     */
    static buildDetailedDashboard(title, description, fields = []) {
        const container = new ContainerBuilder();

        // 1. Heading
        const formattedTitle = title.startsWith('#') ? title : `### ${title}`;
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(formattedTitle)
        );

        // 2. Main Divider
        container.addSeparatorComponents(
            new SeparatorBuilder()
                .setSpacing(SeparatorSpacingSize.Small)
                .setDivider(true)
        );

        // 3. Description (if any)
        if (description) {
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(description)
            );
        }

        // 4. Fields (if any)
        if (fields.length > 0) {
            // Add a divider before fields if there was a description
            if (description) {
                container.addSeparatorComponents(
                    new SeparatorBuilder()
                        .setSpacing(SeparatorSpacingSize.Small)
                        .setDivider(true)
                );
            }

            const fieldsContent = fields.map(f => `**${f.name}:** ${f.value}`).join('\n');
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(fieldsContent)
            );
        }

        // 5. Bottom Divider & Spacer
        container.addSeparatorComponents(
            new SeparatorBuilder()
                .setSpacing(SeparatorSpacingSize.Small)
                .setDivider(true)
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
                .setSpacing(SeparatorSpacingSize.Small)
                .setDivider(false)
        );

        return [container];
    }
    /**
     * Build a usage error message
     * @param {string} usage 
     * @returns {ContainerBuilder[]}
     */
    static buildUsage(usage) {
        const container = new ContainerBuilder();

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`${config.emojis.error || '❌'} **Invalid Usage**\n${config.emojis.dot || '•'} **Usage:** \`${usage}\``)
        );

        return [container];
    }

    /**
     * Build a fixed default welcome message
     * @param {Object} user - Discord User object
     * @param {Object} guild - Discord Guild object
     * @returns {Object} { components, flags }
     */
    static buildFixedWelcome(user, guild) {
        const container = new ContainerBuilder();

        const welcomeText = `## Welcome to ${guild.name}!\nHello <@${user.id}>, we're excited to have you here! ${config.emojis.dot || '•'}\n\n> Welcome to our community! Please make sure to read the rules and enjoy your stay.`;

        const section = new SectionBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(welcomeText))
            .setThumbnailAccessory(
                new ThumbnailBuilder().setURL(user.displayAvatarURL({ dynamic: true, size: 512 }))
            );

        container.addSectionComponents(section);

        return {
            components: [container],
            flags: this.getFlags()
        };
    }


    /**
     * Build a "Premium Required" message with C2A and buttons
     * @param {Object} client 
     * @param {string} featureName 
     * @returns {ContainerBuilder[]}
     */
    static buildPremiumRequired(client, featureName) {
        const container = this.buildDashboard(
            `### ${config.emojis.premium || '✨'} **Premium Required**`,
            `The **${featureName}** system is part of our **Elite Tier**.\n\n` +
            `${config.emojis.dot || '•'} **Required:** Kyra Premium Upgrade\n` +
            `${config.emojis.dot || '•'} **Status:** Upgrade Pending or Expired\n\n` +
            `*Join our support server below to upgrade and unlock premium features across your entire community!*`
        );

        container[0].addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('Join Support Server')
                    .setURL(config.bot.supportServer)
                    .setStyle(ButtonStyle.Link),
                new ButtonBuilder()
                    .setLabel('Upgrade to Premium')
                    .setURL(config.bot.supportServer) // Can be website if specific upgrade link exists
                    .setStyle(ButtonStyle.Link)
            )
        );

        return container;
    }

    /**
     * Send an auto-deleting usage message
     * @param {Object} context - { client, message, interaction }
     * @param {string} usage 
     */
    static async sendUsage({ client, message, interaction }, usage) {
        const isSlash = !!interaction;
        const container = this.buildUsage(usage);

        let sentMessage;
        if (isSlash) {
            sentMessage = await interaction.editReply({ components: container, flags: this.getFlags() }).catch(() => null);
        } else {
            sentMessage = await message.reply({ components: container, flags: this.getFlags() }).catch(() => null);
        }

        setTimeout(() => {
            if (isSlash) {
                interaction.deleteReply().catch(() => { });
            } else if (sentMessage) {
                sentMessage.delete().catch(() => { });
            }
        }, 3000);

        return sentMessage;
    }
}
