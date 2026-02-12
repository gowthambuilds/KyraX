import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    _id: { type: String, required: true }, // Discord User ID
    lastPings: [{
        guildId: { type: String, required: true },
        channelId: { type: String, required: true },
        authorId: { type: String, required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now }
    }]
}, {
    timestamps: true,
    _id: false
});

export default mongoose.model('User', UserSchema);
