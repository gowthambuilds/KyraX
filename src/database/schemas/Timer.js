import mongoose from 'mongoose';

const TimerSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    guildId: { type: String },
    channelId: { type: String, required: true },
    type: { type: String, enum: ['TIMER', 'TIMEOUT', 'TEMPBAN'], default: 'TIMER' },
    message: { type: String, required: true },
    duration: { type: Number, required: true }, // Duration in ms
    expiresAt: { type: Date, required: true },
    completed: { type: Boolean, default: false }
}, {
    timestamps: true
});

// Index for efficient polling of expired timers
TimerSchema.index({ expiresAt: 1, completed: 1 });

export default mongoose.model('Timer', TimerSchema);
