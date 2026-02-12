import { PermissionFlagsBits } from 'discord.js';
import { TicketUI } from '#classes/TicketUI';

export default {
    name: 'panel',
    description: 'Send the ticket panel',
    async execute({ client, message, interaction }) {
        const isSlash = !!interaction;
        const member = isSlash ? interaction.member : message.member;
        const channel = isSlash ? interaction.channel : message.channel;
        const guild = isSlash ? interaction.guild : message.guild;


        if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            const msg = 'You do not have permission to use this command.';
            return isSlash ? interaction.reply({ content: msg, flags: TicketUI.getFlags(true) }) : message.reply(msg);
        }


        const categories = [
            { id: 'support', name: 'General Support', description: 'Get assistance with general inquiries and community help.', emoji: '🛠️' },
            { id: 'coding', name: 'Coding', description: 'Submit bugs, request features, or get help with development.', emoji: '💻' },
            { id: 'billing', name: 'Billing', description: 'Questions regarding payments, donations, or shop items.', emoji: '💳' },
            { id: 'owner', name: 'Talk To Owner', description: 'Direct communication for sensitive or high-level issues.', emoji: '👑' },
            { id: 'staff', name: 'Staff Apply', description: 'Apply to join the Nextra Forge staff team.', emoji: '📝' },
            { id: 'reward', name: 'Reward Claim', description: 'Claim your event rewards or community perks.', emoji: '🎁' }
        ];


        const components = TicketUI.buildPanel(categories);


        if (isSlash) {
            await interaction.reply({ components: components, flags: TicketUI.getFlags() });
        } else {
            await channel.send({
                components: components,
                flags: TicketUI.getFlags()
            });
        }

    }
};
