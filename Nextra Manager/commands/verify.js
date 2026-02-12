import { ApplicationCommandOptionType, PermissionFlagsBits } from 'discord.js';
import { TicketUI } from '#classes/TicketUI';

export default {
    name: 'verify',
    description: 'Manually verify a user as a subscriber',
    options: [
        {
            name: 'user',
            description: 'The user to verify',
            type: ApplicationCommandOptionType.User,
            required: true
        }
    ],
    async execute({ client, message, interaction, args }) {
        const isSlash = !!interaction;
        const guild = isSlash ? interaction.guild : message.guild;
        const member = isSlash ? interaction.member : message.member;

        const targetUser = isSlash
            ? interaction.options.getUser('user')
            : message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);

        if (!member.permissions.has(PermissionFlagsBits.ManageRoles)) {
            const msg = 'You need Manage Roles permissions to use this command.';
            return isSlash ? interaction.reply({ components: TicketUI.buildSimpleMessage(msg), flags: TicketUI.getFlags(true) }) : message.reply(msg);
        }

        if (!targetUser) {
            const msg = 'Please specify a valid user to verify.';
            return isSlash ? interaction.reply({ components: TicketUI.buildSimpleMessage(msg), flags: TicketUI.getFlags(true) }) : message.reply(msg);
        }

        const settings = await client.db.getSettings(guild.id);
        const roleId = settings.verificationRoleId;

        if (!roleId) {
            const msg = 'Verification role is not set. Use `setverifyrole` first.';
            return isSlash ? interaction.reply({ components: TicketUI.buildSimpleMessage(msg), flags: TicketUI.getFlags(true) }) : message.reply(msg);
        }

        try {
            const targetMember = await guild.members.fetch(targetUser.id);
            await targetMember.roles.add(roleId);

            const msg = `${client.config.emojis.check} **User Verified!**\n<@${targetUser.id}> has been manually verified and given the subscriber role.`;
            if (isSlash) {
                await interaction.reply({ components: TicketUI.buildSimpleMessage(msg), flags: TicketUI.getFlags() });
            } else {
                await message.reply(msg);
            }
        } catch (error) {
            client.logger.error('VERIFY', `Failed to manually verify ${targetUser.id}`, error);
            const msg = `${client.config.emojis.cross} Failed to assign the role. Ensure the bot has permission to manage it.`;
            if (isSlash) {
                await interaction.reply({ components: TicketUI.buildSimpleMessage(msg), flags: TicketUI.getFlags(true) });
            } else {
                await message.reply(msg);
            }
        }
    }
};
