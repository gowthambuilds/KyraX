import OpenAI from 'openai';
import { logger } from '#src/utils/logger.js';

export class AIService {
    /**
     * Generates a structural JSON map of a discord server based on a prompt.
     * @param {object} client The Discord client containing config.
     * @param {string} prompt The prompt for the server description.
     * @returns {Promise<object|null>}
     */
    static async generateServerStructure(client, prompt) {
        if (!client.config.openRouterKey) {
            logger.error('AIService', 'OpenRouter API Key is missing in config.');
            return null;
        }

        const openai = new OpenAI({
            apiKey: client.config.openRouterKey,
            baseURL: 'https://openrouter.ai/api/v1',
            defaultHeaders: {
                'HTTP-Referer': client.config.bot.website || 'https://github.com/NextraForge/Kyra-X',
                'X-Title': client.config.bot.name || 'Kyra X',
            }
        });

        const systemPrompt = `You are an expert Discord server architect.
Your task is to DESIGN a complete Discord server from scratch based on the user's prompt. 
You must dynamically generate appropriate roles, categories, and channels that fit the requested theme.
You must return your design ONLY as a raw JSON object. Do not include markdown formatting or code blocks.

The JSON schema must look like this example (but YOU must generate your own data):
{
  "roles": [
    { "id": "temp_role_1", "name": "Admin", "color": "#ff0000", "permissions": ["Administrator"], "hoist": true },
    { "id": "temp_role_2", "name": "Member", "color": "#00ff00", "permissions": [], "hoist": true }
  ],
  "categories": [
    { "id": "temp_cat_1", "name": "Information" }
  ],
  "channels": [
    {
      "name": "announcements",
      "type": 0,
      "categoryId": "temp_cat_1",
      "permissionOverwrites": [
        { "id": "@everyone", "allow": ["ViewChannel"], "deny": ["SendMessages"] },
        { "id": "temp_role_1", "allow": ["SendMessages"], "deny": [] }
      ]
    }
  ]
}

Important Rules:
1. Generate unique, fitting roles for the requested server type. Assign them logical Discord permissions (e.g., "Administrator", "ManageChannels").
2. Generate fitting categories and channels (Types: 0 for Text, 2 for Voice).
3. DO NOT include the bot's own roles or Discord managed roles in the JSON.
4. "id" fields in your JSON are just temporary string identifiers so you can link your generated roles/categories to your generated channels in the "permissionOverwrites".
5. Set up proper "permissionOverwrites". For example, if you make an "announcements" channel, deny "@everyone" the "SendMessages" permission, but allow "ViewChannel", and allow your temp Admin role to "SendMessages". Make sure to do this for all restricted channels.
6. The user is relying on YOU to design the entire server structure dynamically.
7. ALL generated channel and category names MUST start with a premium minimal text symbol (e.g. "・general", "△-announcements", "■-rules", "▸-chat", "｜-voice"). DO NOT use standard Discord emojis.
8. Return ONLY JSON. No explanation text.`;

        try {
            const completion = await openai.chat.completions.create({
                model: 'arcee-ai/trinity-large-preview:free', // Reusing the configured model
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: prompt }
                ]
            });

            let content = completion.choices[0]?.message?.content?.trim();
            if (!content) {
                logger.error('AIService', 'Empty response from model.');
                return null;
            }

            // Strip markdown code blocks if present
            if (content.startsWith('```json')) content = content.slice(7);
            else if (content.startsWith('```')) content = content.slice(3);
            if (content.endsWith('```')) content = content.slice(0, -3);

            content = content.trim();

            return JSON.parse(content);
        } catch (error) {
            logger.error('AIService', 'Failed to generate server structure:', error);
            return null;
        }
    }
}
