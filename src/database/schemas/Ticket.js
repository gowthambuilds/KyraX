import mongoose from 'mongoose';

const TicketSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    channelId: { type: String, required: true }, // The ID of the private ticket channel
    userId: { type: String, required: true }, // The user who opened the ticket
    panelId: { type: String, required: true }, // Reference to the panel that spawned this ticket
    categoryId: { type: String, required: true }, // The specific category they chose
    status: { type: String, default: 'open', enum: ['open', 'closed'] },
    claimedBy: { type: String, default: null }, // User ID of the staff member who claimed it
    users: { type: [String], default: [] } // Additional users added to the ticket
}, {
    timestamps: true
});

export default mongoose.model('Ticket', TicketSchema);
