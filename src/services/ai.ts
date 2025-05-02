// src/services/ai.ts
import OpenAI from 'openai';
import logger from '../utils/logger.js';

// Create OpenAI instance only if API key is present
const createOpenAI = () => {
  if (!process.env.OPENAI_API_KEY) {
    logger.warn('OpenAI API key not found. AI features will be disabled.');
    return null;
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
};

const openai = createOpenAI();

/**
 * Summarizes article content using OpenAI GPT-4.
 *
 * @param content - The full text content of the article
 * @returns A short summary string
 */
export const summarizeContent = async (content: string): Promise<string> => {
  try {
    if (!openai) {
      return 'AI summarization is unavailable (missing API key)';
    }

    const prompt = `
      Summarize the following tech blog content in 3 concise bullet points:

      ${content.slice(0, 8000)}
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that summarizes content.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content?.trim() || 'No summary available';
  } catch (error) {
    logger.error('Error generating summary:', error);
    return 'Error generating summary';
  }
};
