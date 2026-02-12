import mongoose from 'mongoose';

const PollSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    messageId: { type: String, required: true },
    question: { type: String, required: true },
    options: [{
        label: String,
        votes: { type: [String], default: [] } // Array of user IDs
    }],
    closed: { type: Boolean, default: false },
    expiresAt: { type: Date }
}, {
    timestamps: true
});

export default mongoose.model('Poll', PollSchema);
