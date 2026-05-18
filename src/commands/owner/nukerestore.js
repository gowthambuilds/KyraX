import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { KyraUI } from '#classes/KyraUI';

export default {
    name: 'nukerestore',
    description: 'Deletes all channels and roles, with options to ignore mentioned ones.',
    aliases: ['nuke', 'restore'],
    ownerOnly: true,
    async execute({ client, message }) {
        if (!client.config.ownerId.includes(message.author.id)) {
            const msg = KyraUI.buildSimpleMessage(`${client.config.emojis.error} You are not authorized to use this command.`);
            return message.channel.send({ components: msg, flags: KyraUI.getFlags() });
        }

        const ignoredChannels = message.mentions.channels.map(c => c.id);
        const ignoredRoles = message.mentions.roles.map(r => r.id);

        // Let's also enforce ignoring the current channel if we want to send the success embed here, but usually a nuke nukes everything, so if it's nuked, we DM the success.

        let confirmContainer;
        if (ignoredChannels.length > 0 || ignoredRoles.length > 0) {
            confirmContainer = KyraUI.buildDetailedDashboard(
                '### ⚠️ **Confirmation Required**',
                `Are you sure you want to execute this command?\n\nThis will **delete ALL channels and roles** in this server (except the ones listed below).\n**This action is irreversible.**`,
                [
                    { name: 'Ignored Channels', value: ignoredChannels.length ? ignoredChannels.map(id => `<#${id}>`).join(' ') : 'None' },
                    { name: 'Ignored Roles', value: ignoredRoles.length ? ignoredRoles.map(id => `<@&${id}>`).join(' ') : 'None' }
                ]
            );
        } else {
            confirmContainer = KyraUI.buildSimpleMessage(`### ⚠️ **Confirmation Required**\nAre you sure you want to execute this command?\n\nThis will **delete ALL channels and roles** in this server.\n**This action is irreversible.**`);
        }

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('nukerestore_confirm')
                .setLabel('Confirm Nuke')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('nukerestore_cancel')
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
        );

        const confirmMsg = await message.reply({
            components: [...confirmContainer, buttons],
            flags: KyraUI.getFlags()
        });

        const collector = confirmMsg.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 60000
        });

        collector.on('collect', async i => {
            if (i.customId === 'nukerestore_cancel') {
                await i.update({
                    components: KyraUI.buildSimpleMessage(`${client.config.emojis.error} Nuke operation cancelled.`)
                });
                return collector.stop();
            }

            if (i.customId === 'nukerestore_confirm') {
                await i.update({
                    components: KyraUI.buildSimpleMessage(`${client.config.emojis.loading} Restoring the server from nuke...`)
                });

                const guildRoles = message.guild.roles.cache.filter(r =>
                    r.id !== message.guild.id &&
                    r.managed === false &&
                    !ignoredRoles.includes(r.id)
                );

                const guildChannels = message.guild.channels.cache.filter(c =>
                    !ignoredChannels.includes(c.id)
                );

                let deletedRoles = 0;
                let deletedChannels = 0;

                const promises = [];

                for (const [id, role] of guildRoles) {
                    promises.push(role.delete('Nukerestore Command').then(() => deletedRoles++).catch(() => { }));
                }

                for (const [id, channel] of guildChannels) {
                    promises.push(channel.delete('Nukerestore Command').then(() => deletedChannels++).catch(() => { }));
                }

                await Promise.allSettled(promises);

                const successContainer = KyraUI.buildDetailedDashboard(
                    `### ${client.config.emojis.success} **Nuke Restore Complete**`,
                    `Successfully nuked the server.`,
                    [
                        { name: 'Deleted Channels', value: `${deletedChannels}` },
                        { name: 'Deleted Roles', value: `${deletedRoles}` }
                    ]
                );

                try {
                    await message.channel.send({ components: successContainer, flags: KyraUI.getFlags() });
                } catch (e) {
                    // In case the channel we replied in was deleted, send to author
                    message.author.send({ components: successContainer }).catch(() => { });
                }

                collector.stop();
            }
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time' && collected.size === 0) {
                confirmMsg.edit({
                    components: KyraUI.buildSimpleMessage(`${client.config.emojis.error} Nuke timed out.`)
                }).catch(() => { });
            }
        });
    }
};
