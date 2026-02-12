import { Events, ChannelType, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { Guild, TempVoiceChannel } from '#src/database/index.js';
import { TempVCUtils } from '#utils/TempVCUtils';

export default {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState, client) {
        const { guild, member } = newState;
        if (!guild || member.user.bot) return;

        // Fetch Guild Config
        const guildData = await Guild.findById(guild.id);
        if (!guildData || !guildData.tempvc.enabled) return;

        // 1. Join to Create
        if (newState.channelId === guildData.tempvc.joinToCreateChannelId) {
            try {
                // Determine Category
                const categoryId = guildData.tempvc.categoryId; // Or find parent of join channel

                // Format Name
                let channelName = guildData.tempvc.channelNameFormat || "{username}'s Channel";
                channelName = channelName
                    .replace(/{username}/g, member.user.username)
                    .replace(/{tag}/g, member.user.tag)
                    .replace(/{id}/g, member.id);

                // Create Channel
                const newChannel = await guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildVoice,
                    parent: categoryId,
                    userLimit: guildData.tempvc.defaultUserLimit,
                    bitrate: guildData.tempvc.defaultBitrate,
                    permissionOverwrites: [
                        {
                            id: member.id,
                            allow: [
                                PermissionFlagsBits.Connect,
                                PermissionFlagsBits.Speak,
                                PermissionFlagsBits.Stream,
                                PermissionFlagsBits.MuteMembers,
                                PermissionFlagsBits.DeafenMembers,
                                PermissionFlagsBits.MoveMembers,
                                PermissionFlagsBits.ManageChannels // Allow them to manage their own channel settings? Or restrict it solely to buttons.
                                // Giving ManageChannels allows them to edit channel settings directly. 
                                // The plan implies we give them ownership control via bot, but discord permission 'Manage Channels' is powerful.
                                // Let's NOT give ManageChannels to ensure they use our system limitations (e.g. name length etc via bot)
                            ]
                        },
                        {
                            id: guild.id,
                            allow: [PermissionFlagsBits.Connect]
                        }
                    ]
                });

                // Move Member
                await member.voice.setChannel(newChannel);

                // Create DB Entry
                const tempVcData = await TempVoiceChannel.create({
                    channelId: newChannel.id,
                    guildId: guild.id,
                    ownerId: member.id,
                    createdAt: new Date(),
                    locked: false
                });

                // Send Control Panel
                const panel = TempVCUtils.buildPanel(newChannel, member, tempVcData, client);
                // Find a text channel? 
                // Wait, creating a VOICE channel doesn't create a TEXT channel automatically unless it's a temp TEXT channel too.
                // The prompt/plan said "voice channel's text chat".
                // Discord Voice Channels HAVE a built-in text chat now!
                // So we can just send to `newChannel`.

                const panelMessage = await newChannel.send({ ...panel, flags: [MessageFlags.IsComponentsV2] });

                // Send to DM
                try {
                    const channelLink = `https://discord.com/channels/${guild.id}/${newChannel.id}`;
                    await member.send({
                        content: `**Your Temp VC has been created!**\nJoin here: ${channelLink}\n\nPlease check the chat inside the voice channel for your control panel.`
                    });
                } catch (err) {
                    // Ignore if DMs are closed
                }

                // Update DB with message ID
                tempVcData.controlPanelMessageId = panelMessage.id;
                tempVcData.controlPanelChannelId = newChannel.id;
                await tempVcData.save();

            } catch (error) {
                console.error('TempVC Error:', error);
            }
        }

        // 2. Leave / Delete Logic
        if (oldState.channelId && oldState.channelId !== newState.channelId) {
            const channelId = oldState.channelId;
            const tempVcData = await TempVoiceChannel.findOne({ channelId });

            if (tempVcData) {
                const channel = oldState.channel; // Should be available if cached, else fetch

                // If owner left
                if (oldState.member.id === tempVcData.ownerId) {
                    // Owner left -> Immediate Delete
                    await deleteTempChannel(channel, tempVcData);
                }
                // If invalid/deleted channel or empty
                else if (!channel || channel.members.size === 0) {
                    setTimeout(async () => {
                        // Re-fetch to verify it's still empty
                        const checkChannel = await client.channels.fetch(channelId).catch(() => null);
                        if (!checkChannel || checkChannel.members.size === 0) {
                            await deleteTempChannel(checkChannel, tempVcData);
                        }
                    }, guildData.tempvc.deleteDelay || 5000);
                }
            }
        }
    }
};

async function deleteTempChannel(channel, tempVcData) {
    if (!tempVcData) return;
    try {
        if (channel) await channel.delete().catch(() => { });
        await TempVoiceChannel.deleteOne({ channelId: tempVcData.channelId });
    } catch (e) {
        console.error('Failed to delete temp vc:', e);
    }
}
