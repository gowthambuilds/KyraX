import mongoose from 'mongoose';

const GiveawaySchema = new mongoose.Schema({
    _id: { type: String, required: true }, // Message ID
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    hostId: { type: String, required: true },
    prize: { type: String, required: true },
    winnerCount: { type: Number, default: 1 },
    startTimestamp: { type: Date, default: Date.now },
    endTimestamp: { type: Date, required: true },
    ended: { type: Boolean, default: false },
    paused: { type: Boolean, default: false },
    pauseStartTime: { type: Date, default: null },
    // Participants are stored in GiveawayEntry collection
}, {
    timestamps: true,
    _id: false
});

// Indexes for efficient querying
GiveawaySchema.index({ guildId: 1, ended: 1 });
GiveawaySchema.index({ endTimestamp: 1, ended: 1 }); // For finding active giveaways ending soon

export default mongoose.model('Giveaway', GiveawaySchema);
