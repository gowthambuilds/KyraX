import { TicketUI } from '#classes/TicketUI';

export default {
    name: 'guildMemberAdd',
    async execute(client, member) {
        const { guild, user } = member;

        if (guild.id !== client.config.bot.mainGuildId) return;

        const settings = await client.db.getSettings(guild.id);


        if (!settings.welcomeEnabled) return;

        // Use configured welcome channel or find a general/system channel
        const channelId = settings.welcomeChannelId || guild.systemChannelId || guild.channels.cache.find(c => c.name.includes('welcome') || c.name.includes('general'))?.id;


        if (!channelId) return;

        const channel = await guild.channels.fetch(channelId).catch(() => null);
        if (!channel) return;


        const components = TicketUI.buildWelcome(user, guild);

        await channel.send({
            components: components,
            flags: TicketUI.getFlags()
        });

    }
};
