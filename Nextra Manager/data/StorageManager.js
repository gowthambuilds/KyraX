import fs from 'fs';
import path from 'path';
import { logger } from '#utils/logger';

export class LocalDB {
    constructor() {
        this.basePath = path.resolve('data');
        this._ensureDirs();
    }

    _ensureDirs() {
        const dirs = ['panels', 'tickets', 'settings'];
        dirs.forEach(dir => {
            const fullPath = path.join(this.basePath, dir);
            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true });
            }
        });
    }

    async getPanels(guildId) {
        const filePath = path.join(this.basePath, 'panels', `${guildId}.json`);
        if (!fs.existsSync(filePath)) return [];
        try {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (e) {
            logger.error('DB', `Error reading panels for ${guildId}`, e);
            return [];
        }
    }

    async savePanels(guildId, panels) {
        const filePath = path.join(this.basePath, 'panels', `${guildId}.json`);
        fs.writeFileSync(filePath, JSON.stringify(panels, null, 2));
    }

    async getTicket(ticketId) {
        const filePath = path.join(this.basePath, 'tickets', `${ticketId}.json`);
        if (!fs.existsSync(filePath)) return null;
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }

    async saveTicket(ticketId, data) {
        const filePath = path.join(this.basePath, 'tickets', `${ticketId}.json`);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    }

    async deleteTicket(ticketId) {
        const filePath = path.join(this.basePath, 'tickets', `${ticketId}.json`);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    async getSettings(guildId) {
        const filePath = path.join(this.basePath, 'settings', `${guildId}.json`);
        if (!fs.existsSync(filePath)) return {};
        try {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (e) {
            return {};
        }
    }

    async saveSettings(guildId, settings) {
        const filePath = path.join(this.basePath, 'settings', `${guildId}.json`);
        fs.writeFileSync(filePath, JSON.stringify(settings, null, 2));
    }
}
