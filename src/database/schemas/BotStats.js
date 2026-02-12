import mongoose from 'mongoose';

const BotStatsSchema = new mongoose.Schema({
    _id: { type: String, required: true }, // 'global'
    totalSongsPlayed: { type: Number, default: 0 },
    maintenanceMode: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('BotStats', BotStatsSchema);
