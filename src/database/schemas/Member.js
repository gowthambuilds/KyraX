import mongoose from 'mongoose';

const MemberSchema = new mongoose.Schema({
    guildId: { type: String, required: true, ref: 'Guild' },
    userId: { type: String, required: true, ref: 'User' },

    // AFK System
    afk: {
        status: { type: Boolean, default: false },
        reason: { type: String, default: null },
        timestamp: { type: Date, default: null }
    }

    // Add other guild-specific user data here
}, {
    timestamps: true
});

// Ensure one document per user per guild
MemberSchema.index({ guildId: 1, userId: 1 }, { unique: true });

export default mongoose.model('Member', MemberSchema);
