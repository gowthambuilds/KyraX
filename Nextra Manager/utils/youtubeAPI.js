import axios from 'axios';
import { logger } from '#utils/logger';

// Get API key from environment variables
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';

// YouTube API base URL
const API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

// Function to validate if a channel ID or handle exists
export async function validateChannel(identifier) {
    if (!YOUTUBE_API_KEY) {
        logger.error('YouTubeAPI', 'YouTube API key not found in environment variables');
        return false;
    }

    try {
        logger.debug('YouTubeAPI', `Validating identifier: "${identifier}"`);

        // Try various strategies sequentially
        const strategies = [
            (identifier.startsWith('UC') && identifier.length === 24) ? { id: identifier } : null,
            { forHandle: identifier.startsWith('@') ? identifier : `@${identifier}` },
            { forUsername: identifier.replace('@', '') },
            { forHandle: identifier.replace('@', '') }
        ].filter(Boolean);

        for (const query of strategies) {
            const res = await axios.get(`${API_BASE_URL}/channels`, {
                params: { part: 'id', ...query, key: YOUTUBE_API_KEY }
            });

            if (res.data.items?.length > 0) return true;
        }

        // Final fallback: Search
        const searchRes = await searchChannels(identifier);
        if (searchRes.length > 0) return true;

        logger.warn('YouTubeAPI', `No channel found for identifier: "${identifier}"`);
        return false;
    } catch (error) {
        logger.error('YouTubeAPI', 'Error validating YouTube channel', error?.response?.data || error.message);
        return false;
    }
}

// Function to get channel information
export async function getChannelInfo(identifier) {
    if (!YOUTUBE_API_KEY) {
        logger.error('YouTubeAPI', 'YouTube API key not found');
        return null;
    }

    try {
        // Try various parameters
        const queries = [
            (identifier.startsWith('UC') && identifier.length === 24) ? { id: identifier } : null,
            { forHandle: identifier.startsWith('@') ? identifier : `@${identifier}` },
            { forUsername: identifier.replace('@', '') },
            { forHandle: identifier.replace('@', '') }
        ].filter(Boolean);

        for (const query of queries) {
            const res = await axios.get(`${API_BASE_URL}/channels`, {
                params: { part: 'snippet,statistics', ...query, key: YOUTUBE_API_KEY }
            });

            if (res.data.items?.length > 0) {
                const channel = res.data.items[0];
                return {
                    id: channel.id,
                    title: channel.snippet.title,
                    description: channel.snippet.description,
                    thumbnailUrl: channel.snippet.thumbnails.default.url,
                    subscriberCount: channel.statistics.subscriberCount
                };
            }
        }

        // Fallback: Search
        const searchRes = await searchChannels(identifier);
        if (searchRes.length > 0) {
            const firstResult = searchRes[0];
            // Recursively get full info using the discovered ID
            return await getChannelInfo(firstResult.id);
        }

        return null;
    } catch (error) {
        logger.error('YouTubeAPI', 'Error fetching channel info', error?.response?.data || error.message);
        return null;
    }
}

/**
 * Search for YouTube channels by keyword
 * @param {string} query - Search query
 * @returns {Array} Array of channel objects
 */
export async function searchChannels(query) {
    if (!YOUTUBE_API_KEY) {
        logger.error('YouTubeAPI', 'YouTube API key not found');
        return [];
    }

    try {
        const response = await axios.get(`${API_BASE_URL}/search`, {
            params: {
                part: 'snippet',
                type: 'channel',
                q: query,
                maxResults: 5,
                key: YOUTUBE_API_KEY
            }
        });

        if (!response.data.items || response.data.items.length === 0) {
            return [];
        }

        // Format the channel data
        return response.data.items.map(item => {
            return {
                id: item.id.channelId,
                title: item.snippet.title,
                description: item.snippet.description,
                thumbnailUrl: item.snippet.thumbnails.default.url
            };
        });
    } catch (error) {
        logger.error('YouTubeAPI', 'Error searching channels', error?.response?.data || error.message);
        return [];
    }
}
