import { Events } from 'discord.js';
import { EventLogger } from '#utils/eventLogger';

export default {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState, client) {
        const { guild, member } = newState;
        if (!guild || member.user.bot) return;

        // 1. Join/Leave
        if (!oldState.channelId && newState.channelId) {
            await EventLogger.log(client, guild, 'voice', {
                title: '🔊 Voice Joined',
                description: `**${member.user.tag}** joined voice channel <#${newState.channelId}>.`,
                fields: [
                    { name: 'User', value: `<@${member.id}>`, inline: true },
                    { name: 'Channel', value: `<#${newState.channelId}>`, inline: true }
                ]
            });
        } else if (oldState.channelId && !newState.channelId) {
            await EventLogger.log(client, guild, 'voice', {
                title: '🔇 Voice Left',
                description: `**${member.user.tag}** left voice channel <#${oldState.channelId}>.`,
                fields: [
                    { name: 'User', value: `<@${member.id}>`, inline: true },
                    { name: 'Channel', value: `<#${oldState.channelId}>`, inline: true }
                ]
            });
        }

        // 2. Move
        if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
            await EventLogger.log(client, guild, 'voice', {
                title: '🔄 Voice Moved',
                description: `**${member.user.tag}** moved between voice channels.`,
                fields: [
                    { name: 'User', value: `<@${member.id}>`, inline: true },
                    { name: 'Old Channel', value: `<#${oldState.channelId}>`, inline: true },
                    { name: 'New Channel', value: `<#${newState.channelId}>`, inline: true }
                ]
            });
        }

        // 3. Mute/Deafen (Server-side)
        if (oldState.serverMute !== newState.serverMute) {
            await EventLogger.log(client, guild, 'voice', {
                title: '🔇 Voice Mute Updated',
                description: `**${member.user.tag}** was ${newState.serverMute ? 'server muted' : 'unmuted'}.`,
                fields: [
                    { name: 'User', value: `<@${member.id}>`, inline: true }
                ]
            });
        }
    }
};
