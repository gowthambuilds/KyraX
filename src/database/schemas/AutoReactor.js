import mongoose from 'mongoose';

const AutoReactorSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    trigger: { type: String, required: true },
    emoji: { type: String, required: true }
}, {
    timestamps: true
});

export default mongoose.model('AutoReactor', AutoReactorSchema);
