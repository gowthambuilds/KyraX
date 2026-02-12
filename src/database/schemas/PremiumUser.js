import mongoose from 'mongoose';

const PremiumUserSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    isPremium: { type: Boolean, default: true },
    startAt: { type: Date, default: Date.now },
    endAt: { type: Date, default: null }, // null means lifetime
    type: { type: String, default: 'user' }
}, {
    timestamps: true
});

export default mongoose.model('PremiumUser', PremiumUserSchema);
