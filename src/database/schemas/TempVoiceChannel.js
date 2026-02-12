import mongoose from 'mongoose';

const TempVoiceChannelSchema = new mongoose.Schema({
    channelId: { type: String, required: true }, // The temporary channel ID
    guildId: { type: String, required: true },
    ownerId: { type: String, required: true }, // User who created it
    createdAt: { type: Date, default: Date.now },
    locked: { type: Boolean, default: false },
    bannedUsers: { type: [String], default: [] }, // Users banned from this specific channel
    controlPanelMessageId: { type: String, default: null }, // ID of the control panel message
    controlPanelChannelId: { type: String, default: null } // Text channel where control panel was sent
});

export default mongoose.model('TempVoiceChannel', TempVoiceChannelSchema);
