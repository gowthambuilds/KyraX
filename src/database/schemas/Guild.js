import mongoose from 'mongoose';

const GuildSchema = new mongoose.Schema({
    _id: { type: String, required: true }, // Discord Guild ID
    prefix: { type: String, default: null }, // If null, uses default from config
    ai: {
        enabled: { type: Boolean, default: true },
        channels: { type: [String], default: [] }, // Array of Channel IDs
        mode: { type: String, default: 'standard' } // Future-proof for different AI modes
    },
    moderation: {
        logChannel: { type: String, default: null },
        caseCount: { type: Number, default: 0 },
        muteRole: { type: String },
        dmOnAction: { type: Boolean, default: true }
    },
    logging: {
        enabled: { type: Boolean, default: false },
        categoryId: { type: String },
        channels: {
            important: { type: String },
            gateway: { type: String },
            invite: { type: String },
            member: { type: String },
            message: { type: String },
            moderation: { type: String },
            channel: { type: String },
            role: { type: String },
            voice: { type: String },
            thread: { type: String },
            webhooks: { type: String },
            emoji: { type: String },
            server: { type: String },
            event: { type: String },
            bot: { type: String }
        }
    },
    stickyData: { type: Map, of: Object, default: new Map() }, // channelId -> { content: string, lastMessageId: string }
    serverStats: {
        enabled: { type: Boolean, default: false },
        channelId: { type: String, default: null },
        messageId: { type: String, default: null },
        statsHistory: [{
            date: { type: String }, // YYYY-MM-DD
            count: { type: Number }
        }]
    },
    autoroles: { type: [String], default: [] },
    greet: {
        enabled: { type: Boolean, default: false },
        channelId: { type: String, default: null },
        content: { type: String, default: null }, // External message text
        title: { type: String, default: null },
        description: { type: String, default: null },
        thumbnail: { type: Boolean, default: false },
        image: { type: String, default: null },
        footer: { type: String, default: null }
    },
    quickGreet: {
        channels: { type: [String], default: [] }
    },
    tempvc: {
        enabled: { type: Boolean, default: false },
        joinToCreateChannelId: { type: String, default: null },
        categoryId: { type: String, default: null }, // Where temp channels are created
        channelNameFormat: { type: String, default: "{username}'s Channel" },
        defaultUserLimit: { type: Number, default: 0 }, // 0 = unlimited
        defaultBitrate: { type: Number, default: 64000 },
        deleteDelay: { type: Number, default: 5000 }, // 5 seconds delay before deletion
        allowRename: { type: Boolean, default: true },
        allowUserLimit: { type: Boolean, default: true },
        allowBitrate: { type: Boolean, default: true },
        allowLock: { type: Boolean, default: true }
    },
    profile: {
        customized: { type: Boolean, default: false },
        avatar: { type: String, default: null },
        nickname: { type: String, default: null },
        banner: { type: String, default: null },
        lastUpdated: { type: Date, default: null }
    },
    ignored: {
        channels: { type: [String], default: [] },
        roles: { type: [String], default: [] },
        users: { type: [String], default: [] }
    }
}, {
    timestamps: true,
    _id: false // Use _id as the primary key manually
});

export default mongoose.model('Guild', GuildSchema);
