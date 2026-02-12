import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize
} from 'discord.js';
import { config } from '#config/config';

export class TicketUI {
    static getFlags(ephemeral = false) {
        let flags = MessageFlags.IsComponentsV2;
        if (ephemeral) flags |= MessageFlags.Ephemeral;
        return flags;
    }

    static buildPanel(categories) {
        const container = new ContainerBuilder();



        const mainText = `## ${config.bot.name} | Support Center\nPlease select a category from the menu below to open a ticket.\n\n### 📜 Rules & Guidelines\n${config.emojis.dot} Do not create tickets for fun. Making tickets for fun will result in a ban.\n${config.emojis.dot} You must provide feedback to the staff after your assistance is complete.`;

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(mainText)
        );

        container.addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('ticket_create')
            .setPlaceholder('Click here to select a category')
            .addOptions(categories.map(cat => ({
                label: cat.name,
                value: cat.id,
                emoji: config.emojis.dot,

                description: cat.description
            })));

        container.addActionRowComponents(new ActionRowBuilder().addComponents(selectMenu));

        return [container];
    }

    static buildTicketActions(ticketId, welcomeMsg, claimedBy = null) {
        const container = new ContainerBuilder();

        let content = welcomeMsg;
        if (claimedBy) {
            content += `\n\n**Claimed by:** <@${claimedBy}>`;
        }

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(content)
        );

        container.addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`ticket_close_${ticketId}`)
                .setLabel('Close')
                .setEmoji(config.emojis.lock)
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`ticket_claim_${ticketId}`)
                .setLabel(claimedBy ? 'Claimed' : 'Claim')
                .setEmoji('🙋‍♂️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!!claimedBy)
        );

        container.addActionRowComponents(row);

        return [container];
    }

    static buildSimpleMessage(message) {
        const container = new ContainerBuilder();

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(message)
        );
        return [container];
    }

    static buildConfirmation(message, label, url) {
        const container = new ContainerBuilder();
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(message)
        );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel(label)
                .setURL(url)
                .setStyle(ButtonStyle.Link)
        );

        container.addActionRowComponents(row);
        return [container];
    }

    static buildWelcome(user, guild) {
        const container = new ContainerBuilder();


        const welcomeText = `## Welcome to ${guild.name}!\nHello <@${user.id}>, we're excited to have you here! ${config.emojis.dot}\n\n> Make sure to check our website if you need any help!`;


        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(welcomeText)
        );

        container.addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Visit Website')
                .setURL(config.bot.website)
                .setStyle(ButtonStyle.Link)
        );


        container.addActionRowComponents(row);
        return [container];
    }
}

