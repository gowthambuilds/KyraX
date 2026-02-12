import mongoose from 'mongoose';

const PremiumGuildSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    isPremium: { type: Boolean, default: true },
    startAt: { type: Date, default: Date.now },
    endAt: { type: Date, default: null }, // null means lifetime
    type: { type: String, default: 'guild' }
}, {
    timestamps: true
});

export default mongoose.model('PremiumGuild', PremiumGuildSchema);
