import mongoose from 'mongoose';

const AutoResponseSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    trigger: { type: String, required: true },
    response: { type: String, required: true }
}, {
    timestamps: true
});

export default mongoose.model('AutoResponse', AutoResponseSchema);
