import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { KyraUI } from '#classes/KyraUI';

export class Pagination {
    /**
     * Create an interactive pagination menu
     * @param {object} options 
     */
    static async create(options) {
        const {
            client,
            interaction,
            message,
            response: existingResponse,
            title,
            items,
            itemsPerPage = 10,
            timeout = 60000,
            allowMultiple = false
        } = options;

        const isSlash = !!interaction;
        const author = isSlash ? interaction.user : message.author;

        // Chunk items
        const pages = [];
        for (let i = 0; i < items.length; i += itemsPerPage) {
            pages.push(items.slice(i, i + itemsPerPage));
        }

        if (pages.length === 0) pages.push(['No items found.']);

        let currentPage = 0;

        const getPage = (index) => {
            const content = pages[index].join('\n');
            const container = KyraUI.buildDashboard(
                `### ${title} (Page ${index + 1}/${pages.length})`,
                content
            );

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('prev')
                    .setLabel('Back')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(index === 0),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('Next')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(index === pages.length - 1)
            );

            return {
                components: [...container, buttons],
                flags: KyraUI.getFlags(),
                allowedMentions: { parse: [] }
            };
        };

        const response = isSlash
            ? await interaction.editReply(getPage(currentPage))
            : (existingResponse ? await existingResponse.edit(getPage(currentPage)) : await message.reply(getPage(currentPage)));

        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: timeout,
            filter: (i) => allowMultiple || i.user.id === author.id
        });

        collector.on('collect', async (i) => {
            if (i.customId === 'prev') currentPage--;
            else if (i.customId === 'next') currentPage++;

            await i.update(getPage(currentPage));
        });

        collector.on('end', async () => {
            const finalPage = getPage(currentPage);
            // Disable all buttons on timeout
            finalPage.components[finalPage.components.length - 1].components.forEach(b => b.data.disabled = true);

            if (isSlash) {
                await interaction.editReply(finalPage).catch(() => { });
            } else {
                await response.edit(finalPage).catch(() => { });
            }
        });
    }
}
