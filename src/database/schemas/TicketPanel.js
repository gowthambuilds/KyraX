import mongoose from 'mongoose';

const CategorySchema = new mongoose.Schema({
    id: { type: String, required: true }, // e.g. 'support_123'
    name: { type: String, required: true }, // e.g. 'General Support'
    description: { type: String, default: null },
    emoji: { type: String, default: null },
    discordCategoryId: { type: String, default: null }, // Discord Category ID where tickets of this type go
    supportRoles: { type: [String], default: [] } // Roles that can view this type of ticket
});

const TicketPanelSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    panelId: { type: String, required: true }, // Internal unique ID for the panel
    name: { type: String, default: 'Ticket Panel' },
    messageId: { type: String, default: null },
    channelId: { type: String, default: null },
    title: { type: String, default: 'Support Tickets' },
    description: { type: String, default: 'Click the button below to open a ticket.' },
    uiStyle: { type: String, default: 'button', enum: ['select', 'button'] },
    placeholder: { type: String, default: 'Select a ticket category' },
    status: { type: Boolean, default: false }, // Active/Inactive
    namingFormat: { type: String, default: 'userid', enum: ['userid', 'number'] },
    ticketCount: { type: Number, default: 0 },
    staffRoles: { type: [String], default: [] },
    defaultCategoryId: { type: String, default: null },
    categories: { type: [CategorySchema], default: [] },
    logChannels: { type: [String], default: [] } // Where transcripts go
}, {
    timestamps: true
});

TicketPanelSchema.index({ guildId: 1, panelId: 1 }, { unique: true });

export default mongoose.model('TicketPanel', TicketPanelSchema);
