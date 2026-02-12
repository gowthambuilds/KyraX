import mongoose from 'mongoose';

const InfractionSchema = new mongoose.Schema({
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    moderatorId: { type: String, required: true },
    type: {
        type: String,
        required: true,
        enum: ['warn', 'kick', 'ban', 'timeout', 'untimeout', 'unban', 'purge', 'nuke', 'softban']
    },
    reason: { type: String, default: 'No reason provided' },
    caseId: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now }
}, {
    timestamps: true
});

// Ensure caseId is unique per guild
InfractionSchema.index({ guildId: 1, caseId: 1 }, { unique: true });

export default mongoose.model('Infraction', InfractionSchema);
