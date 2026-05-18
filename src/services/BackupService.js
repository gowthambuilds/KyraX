import { ChannelType, PermissionFlagsBits } from 'discord.js';
import { Backup } from '#src/database/index.js';
import { logger } from '#utils/logger';
import crypto from 'crypto';

class BackupService {
    /**
     * Creates a backup for a guild.
     */
    async createBackup(guild, userId, name) {
        try {
            const backupId = crypto.randomBytes(4).toString('hex').toUpperCase();

            // 1. Fetch all roles
            const allRoles = await guild.roles.fetch();
            const rolesData = allRoles
                .filter(r => !r.managed && r.id !== guild.id)
                .sort((a, b) => b.position - a.position)
                .map(r => ({
                    id: r.id,
                    name: r.name,
                    color: r.color,
                    hoist: r.hoist,
                    permissions: r.permissions.bitfield.toString(),
                    mentionable: r.mentionable,
                    position: r.position,
                    isEveryone: false
                }));

            // Add @everyone
            const everyoneRole = guild.roles.everyone;
            rolesData.push({
                id: everyoneRole.id,
                name: everyoneRole.name,
                color: everyoneRole.color,
                hoist: everyoneRole.hoist,
                permissions: everyoneRole.permissions.bitfield.toString(),
                mentionable: everyoneRole.mentionable,
                position: everyoneRole.position,
                isEveryone: true
            });

            // Helper for mapping role IDs to names in overwrites
            const getRoleName = (id) => allRoles.get(id)?.name || null;

            // 2. Fetch all channels
            const allChannels = await guild.channels.fetch();
            const categories = allChannels.filter(c => c.type === ChannelType.GuildCategory);
            const others = allChannels.filter(c => c.type !== ChannelType.GuildCategory);

            const categoriesData = categories
                .sort((a, b) => a.position - b.position)
                .map(c => ({
                    name: c.name,
                    position: c.position,
                    permissions: c.permissionOverwrites.cache.map(p => ({
                        id: String(p.id),
                        roleName: p.type === 0 ? getRoleName(p.id) : null,
                        type: Number(p.type),
                        allow: p.allow.bitfield.toString(),
                        deny: p.deny.bitfield.toString()
                    }))
                }));

            const othersData = Array.from(others.values())
                .sort((a, b) => a.position - b.position)
                .map(c => ({
                    name: String(c.name),
                    type: Number(c.type),
                    topic: c.topic || null,
                    bitrate: Number(c.bitrate) || null,
                    userLimit: Number(c.userLimit) || null,
                    nsfw: Boolean(c.nsfw),
                    rateLimitPerUser: Number(c.rateLimitPerUser) || 0,
                    parentName: c.parent?.name || null,
                    position: Number(c.position),
                    permissions: c.permissionOverwrites.cache.map(p => ({
                        id: String(p.id),
                        roleName: p.type === 0 ? getRoleName(p.id) : null,
                        type: Number(p.type),
                        allow: p.allow.bitfield.toString(),
                        deny: p.deny.bitfield.toString()
                    }))
                }));

            // 3. Save to Database
            const backup = await Backup.create({
                _id: backupId,
                guildId: guild.id,
                userId: userId,
                name: name,
                guild: {
                    name: guild.name,
                    description: guild.description,
                    iconURL: guild.iconURL({ forceStatic: true }),
                    bannerURL: guild.bannerURL({ forceStatic: true }),
                    preferredLocale: guild.preferredLocale,
                    verificationLevel: guild.verificationLevel,
                    defaultMessageNotifications: guild.defaultMessageNotifications,
                    explicitContentFilter: guild.explicitContentFilter,
                    afkTimeout: guild.afkTimeout,
                    afkChannelId: guild.afkChannelId,
                    systemChannelId: guild.systemChannelId,
                    systemChannelFlags: guild.systemChannelFlags.bitfield.toString(),
                    publicUpdatesChannelId: guild.publicUpdatesChannelId,
                    rulesChannelId: guild.rulesChannelId
                },
                roles: rolesData,
                channels: {
                    categories: categoriesData,
                    others: othersData
                }
            });

            return backup;
        } catch (error) {
            if (error.name === 'ValidationError') {
                logger.error('BACKUP', `Schema Validation Error for ${guild.id}: ${Object.keys(error.errors).map(k => `${k}: ${error.errors[k].message}`).join(', ')}`);
            } else {
                logger.error('BACKUP', `Failed to create backup for ${guild.id}`, error);
            }
            throw error;
        }
    }

    /**
     * Applies a backup to a guild.
     */
    async applyBackup(guild, identifier) {
        try {
            const backup = await Backup.findOne({
                $or: [{ _id: identifier }, { name: identifier }],
                guildId: guild.id
            }).lean();
            if (!backup) throw new Error('Backup not found.');

            // --- STEP 1: DESTRUCTIVE CLEANUP ---
            const channels = await guild.channels.fetch();
            for (const channel of channels.values()) {
                await channel.delete().catch(() => { });
            }

            const roles = await guild.roles.fetch();
            for (const role of roles.values()) {
                if (!role.managed && role.id !== guild.id && role.editable) {
                    await role.delete().catch(() => { });
                }
            }

            // --- STEP 2: RECREATE ROLES ---
            const roleNameMap = new Map(); // Name -> New ID
            let rolesCreated = 0;

            // Handle @everyone first
            const storedEveryone = backup.roles.find(r => r.isEveryone);
            if (storedEveryone) {
                await guild.roles.everyone.setPermissions(BigInt(storedEveryone.permissions)).catch(() => { });
                roleNameMap.set(storedEveryone.name, guild.id);
                rolesCreated++;
            }

            // Create other roles in reverse position order (highest first)
            for (const r of backup.roles.filter(r => !r.isEveryone).sort((a, b) => b.position - a.position)) {
                const newRole = await guild.roles.create({
                    name: r.name,
                    color: r.color,
                    hoist: r.hoist,
                    permissions: BigInt(r.permissions),
                    mentionable: r.mentionable
                    // Position is tricky on create, but we created in order
                }).catch(() => null);

                if (newRole) {
                    roleNameMap.set(r.name, newRole.id);
                    rolesCreated++;
                }
            }

            // --- STEP 3: RECREATE CATEGORIES ---
            const categoryMap = new Map();
            let categoriesCreated = 0;
            for (const cat of backup.channels.categories) {
                const newCat = await guild.channels.create({
                    name: cat.name,
                    type: ChannelType.GuildCategory,
                    position: cat.position
                }).catch(() => null);

                if (newCat) {
                    categoryMap.set(cat.name, newCat);
                    categoriesCreated++;
                    const overwrites = this.mapOverwrites(cat.permissions, roleNameMap, guild);
                    if (overwrites.length > 0) {
                        await newCat.permissionOverwrites.set(overwrites).catch(() => { });
                    }
                }
            }

            // --- STEP 4: RECREATE OTHERS ---
            let channelsCreated = 0;
            for (const ch of backup.channels.others) {
                const parent = ch.parentName ? categoryMap.get(ch.parentName) : null;

                const newCh = await guild.channels.create({
                    name: ch.name,
                    type: ch.type,
                    topic: ch.topic,
                    bitrate: ch.bitrate,
                    userLimit: ch.userLimit,
                    nsfw: ch.nsfw,
                    rateLimitPerUser: ch.rateLimitPerUser,
                    parent: parent ? parent.id : null,
                    position: ch.position
                }).catch(() => null);

                if (newCh) {
                    channelsCreated++;
                    if (ch.permissions.length > 0) {
                        const overwrites = this.mapOverwrites(ch.permissions, roleNameMap, guild);
                        if (overwrites.length > 0) {
                            await newCh.permissionOverwrites.set(overwrites).catch(() => { });
                        }
                    }
                }
            }

            return {
                roles: rolesCreated,
                categories: categoriesCreated,
                channels: channelsCreated
            };
        } catch (error) {
            logger.error('BACKUP', `Failed to apply backup ${backupId} to ${guild.id}`, error);
            throw error;
        }
    }

    /**
     * Clones a backup (by ID only, no guild restriction) into a target guild.
     * Owner-only variant of applyBackup that works cross-server.
     */
    async cloneBackup(targetGuild, backupId) {
        const backup = await Backup.findById(backupId.toUpperCase()).lean();
        if (!backup) throw new Error('Backup not found.');

        // --- STEP 1: NUKE ALL OLD CHANNELS & ROLES FIRST (parallel fetch + blast delete) ---
        const [existingChannels, existingRoles] = await Promise.all([
            targetGuild.channels.fetch().catch(() => new Map()),
            targetGuild.roles.fetch().catch(() => new Map())
        ]);

        // Fire every delete simultaneously — channels AND roles at the same time
        await Promise.allSettled([
            // Delete all channels
            ...[...existingChannels.values()].map(c => c.delete().catch(() => {})),
            // Delete all deletable roles
            ...[...existingRoles.values()]
                .filter(r => !r.managed && r.id !== targetGuild.id && r.editable)
                .map(r => r.delete().catch(() => {}))
        ]);
        // ✅ Everything is wiped — now we build from scratch

        // --- STEP 2: RECREATE ROLES ---
        const roleNameMap = new Map();
        let rolesCreated = 0;

        const storedEveryone = backup.roles.find(r => r.isEveryone);
        if (storedEveryone) {
            await targetGuild.roles.everyone.setPermissions(BigInt(storedEveryone.permissions)).catch(() => {});
            roleNameMap.set(storedEveryone.name, targetGuild.id);
            rolesCreated++;
        }

        for (const r of backup.roles.filter(r => !r.isEveryone).sort((a, b) => b.position - a.position)) {
            const newRole = await targetGuild.roles.create({
                name: r.name,
                color: r.color,
                hoist: r.hoist,
                permissions: BigInt(r.permissions),
                mentionable: r.mentionable
            }).catch(() => null);

            if (newRole) {
                roleNameMap.set(r.name, newRole.id);
                rolesCreated++;
            }
        }

        // --- STEP 3: RECREATE CATEGORIES ---
        const categoryMap = new Map();
        let categoriesCreated = 0;
        for (const cat of backup.channels.categories) {
            const newCat = await targetGuild.channels.create({
                name: cat.name,
                type: 4, // ChannelType.GuildCategory
                position: cat.position
            }).catch(() => null);

            if (newCat) {
                categoryMap.set(cat.name, newCat);
                categoriesCreated++;
                const overwrites = this.mapOverwrites(cat.permissions, roleNameMap, targetGuild);
                if (overwrites.length > 0) await newCat.permissionOverwrites.set(overwrites).catch(() => {});
            }
        }

        // --- STEP 4: RECREATE CHANNELS ---
        let channelsCreated = 0;
        for (const ch of backup.channels.others) {
            const parent = ch.parentName ? categoryMap.get(ch.parentName) : null;
            const newCh = await targetGuild.channels.create({
                name: ch.name,
                type: ch.type,
                topic: ch.topic,
                bitrate: ch.bitrate,
                userLimit: ch.userLimit,
                nsfw: ch.nsfw,
                rateLimitPerUser: ch.rateLimitPerUser,
                parent: parent ? parent.id : null,
                position: ch.position
            }).catch(() => null);

            if (newCh) {
                channelsCreated++;
                const overwrites = this.mapOverwrites(ch.permissions, roleNameMap, targetGuild);
                if (overwrites.length > 0) await newCh.permissionOverwrites.set(overwrites).catch(() => {});
            }
        }

        return { sourceGuildName: backup.guild.name, roles: rolesCreated, categories: categoriesCreated, channels: channelsCreated };
    }

    mapOverwrites(permissions, roleNameMap, guild) {
        const overwrites = [];
        for (const p of permissions) {
            let targetId = null;

            if (p.type === 0) { // Role
                targetId = roleNameMap.get(p.roleName);
            } else {
                // Member perms - currently not mapped as IDs change and members might not be in server
                continue;
            }

            if (targetId) {
                overwrites.push({
                    id: targetId,
                    type: p.type,
                    allow: BigInt(p.allow),
                    deny: BigInt(p.deny)
                });
            }
        }
        return overwrites;
    }
}

export const backupService = new BackupService();
