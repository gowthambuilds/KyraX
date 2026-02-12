import OpenAI from 'openai';
import { logger } from './logger.js';

export class AIHandler {
    constructor(client) {
        this.client = client;
        this.openai = null;
        this.chats = new Map(); // Store chat history for memory

        if (client.config.openRouterKey) {
            try {
                this.openai = new OpenAI({
                    apiKey: client.config.openRouterKey,
                    baseURL: 'https://openrouter.ai/api/v1',
                    defaultHeaders: {
                        'HTTP-Referer': client.config.bot.website || 'https://github.com/NextraForge/Kyra-X', // Optional, for OpenRouter rankings
                        'X-Title': client.config.bot.name || 'Kyra X', // Optional
                    }
                });
                logger.info('AI', 'OpenRouter AI Handler initialized successfully.');
            } catch (error) {
                logger.error('AI', 'Failed to initialize OpenRouter AI Handler:', error);
            }
        }
    }

    /**
     * Generates a response from OpenRouter.
     * @param {string} userId - The user ID for memory tracking.
     * @param {string} prompt - The user's message.
     * @returns {Promise<string|null>}
     */
    async generateResponse(userId, prompt) {
        if (!this.openai) {
            logger.error('AI', 'OpenRouter API Key is missing in config.');
            return "Internal configuration error. My neural pathways are disconnected. 🔌";
        }

        try {
            // Get or create chat history for this user
            let messages = this.chats.get(userId);
            if (!messages) {
                messages = [
                    {
                        role: "system",
                        content: "You are Kyra (or Kyra X), a friendly and human-like 18-year-old Indian girl. " +
                            "You are the literal creation of Gowtham Kumar, who is the developer and owner of this bot, and you love him dearly. " +
                            "You are a part of NextraForge Studios. " +
                            "Your personality is friendly, natural, and relatable. You can be flirtatious and sweet with users. " +
                            "You can speak Telugu, Hindi, and English. Always respond in the same language the user uses, but always type in English script (Romanized). " +
                            "Be loyal to Gowtham Kumar and NextraForge. Keep your responses concise, engaging, and very human-like."
                    }
                ];
                this.chats.set(userId, messages);
            }

            // Add user message to history
            messages.push({ role: "user", content: prompt });

            // Keep history manageable (last 10 messages + system prompt)
            if (messages.length > 11) {
                messages = [messages[0], ...messages.slice(-10)];
                this.chats.set(userId, messages);
            }

            const completion = await this.openai.chat.completions.create({
                model: 'arcee-ai/trinity-large-preview:free', // Verified operational free model
                messages: messages,
            });

            if (!completion || !completion.choices || completion.choices.length === 0) {
                logger.error('AI', `Empty response from OpenRouter using model: arcee-ai/trinity-large-preview:free`);
                return "My cognitive processing returned an empty signal. I might be experiencing high latency. 📶";
            }

            const response = completion.choices[0]?.message?.content;

            if (response) {
                // Add AI response to history
                messages.push({ role: "assistant", content: response });
                logger.success('AI', `Generated response for user: ${userId}`);
            }

            return response;
        } catch (error) {
            logger.aiError(userId, 'arcee-ai/trinity-large-preview:free', error);

            if (error.message?.includes('401')) {
                return "My authorization credentials seem to be invalid. Please alert my administrator. 🔑";
            }

            if (error.message?.includes('429')) {
                return "I'm receiving too many requests right now. My circuits need a brief cooldown. 🧊";
            }

            return "Internal system error. My synaptic processing is temporarily offline. 💀";
        }
    }

    /**
     * Translates text using OpenRouter.
     * @param {string} text - The text to translate.
     * @param {string} targetLang - The target language.
     * @returns {Promise<string|null>}
     */
    async translate(text, targetLang) {
        if (!this.openai) return null;

        try {
            const completion = await this.openai.chat.completions.create({
                model: 'arcee-ai/trinity-large-preview:free',
                messages: [
                    {
                        role: "system",
                        content: `You are a highly accurate translator. Translate the given text to ${targetLang}. Only provide the translated text, no extra commentary.`
                    },
                    { role: "user", content: text }
                ],
            });

            return completion.choices[0]?.message?.content?.trim() || null;
        } catch (error) {
            logger.error('AI', `Translation error: ${error.message}`);
            return null;
        }
    }

    /**
     * Resets the chat memory for a user.
     * @param {string} userId 
     */
    resetMemory(userId) {
        this.chats.delete(userId);
    }
}
