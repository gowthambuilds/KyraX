import mongoose from 'mongoose';

const BackupSchema = new mongoose.Schema({
    _id: { type: String, required: true }, // Custom ID (e.g., short hash)
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true }, // Who created the backup
    name: { type: String, required: true },

    // Server Properties
    guild: {
        name: String,
        description: String,
        iconURL: String,
        bannerURL: String,
        splashURL: String,
        preferredLocale: String,
        verificationLevel: Number,
        defaultMessageNotifications: Number,
        explicitContentFilter: Number,
        afkTimeout: Number,
        afkChannelId: String,
        systemChannelId: String,
        systemChannelFlags: { type: String, default: '0' },
        publicUpdatesChannelId: { type: String, default: null },
        rulesChannelId: { type: String, default: null }
    },

    // Roles
    roles: [{
        id: String, // Old ID for internal mapping during creation
        name: String,
        color: Number,
        hoist: Boolean,
        permissions: String, // String representation of bitfield
        mentionable: Boolean,
        position: Number,
        isEveryone: { type: Boolean, default: false }
    }],

    // Channels
    channels: {
        categories: [{
            name: String,
            position: Number,
            permissions: [{
                id: String, // Old ID
                roleName: String, // Added for mapping
                type: { type: Number }, // 0 for role, 1 for member
                allow: String,
                deny: String
            }]
        }],
        others: [{
            name: String,
            type: { type: Number },
            topic: String,
            bitrate: Number,
            userLimit: Number,
            nsfw: Boolean,
            rateLimitPerUser: Number,
            parentName: String, // To link to category by name since IDs change
            position: Number,
            permissions: [{
                id: String,
                roleName: String, // Added for mapping
                type: { type: Number },
                allow: String,
                deny: String
            }]
        }]
    }
}, {
    timestamps: true
});

export default mongoose.model('Backup', BackupSchema);
