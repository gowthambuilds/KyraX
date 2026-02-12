import mongoose from 'mongoose';

const premiumTokenSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true
    },
    duration: {
        type: String,
        default: 'life'
    },
    totalUses: {
        type: Number,
        default: 1
    },
    remainingUses: {
        type: Number,
        default: 1
    },
    claimedBy: [{
        type: String // guildId
    }],
    claims: [{
        guildId: String,
        userId: String,
        at: { type: Date, default: Date.now }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const PremiumToken = mongoose.model('PremiumToken', premiumTokenSchema);
export default PremiumToken;
