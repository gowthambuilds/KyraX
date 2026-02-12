import mongoose from 'mongoose';

const GiveawayEntrySchema = new mongoose.Schema({
    giveawayId: { type: String, required: true, ref: 'Giveaway' },
    userId: { type: String, required: true }
}, {
    timestamps: { createdAt: true, updatedAt: false } // Only care about when they joined
});

// Ensure a user can only join a giveaway once
GiveawayEntrySchema.index({ giveawayId: 1, userId: 1 }, { unique: true });

export default mongoose.model('GiveawayEntry', GiveawayEntrySchema);
