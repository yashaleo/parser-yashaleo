// src/services/classification.ts

import OpenAI from 'openai';
import logger from '../utils/logger';

export interface ClassificationResult {
  categories: string[];
  topics: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  readingLevel: 'basic' | 'intermediate' | 'advanced';
  error?: string;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Uses OpenAI GPT to classify article content.
 *
 * @param title - Article title
 * @param content - Article body or excerpt
 * @returns Classification result object
 */
export const classifyContent = async (
  title: string,
  content: string
): Promise<ClassificationResult> => {
  if (!process.env.OPENAI_API_KEY) {
    return {
      categories: ['Uncategorized'],
      topics: [],
      sentiment: 'neutral',
      readingLevel: 'intermediate',
    };
  }

  const prompt = `
    Analyze the following article title and excerpt.
    
    Title: ${title}
    Content excerpt: ${content.substring(0, 1000)}
    
    Respond only in this JSON format:
    {
      "categories": ["Category1", "Category2"],
      "topics": ["tag1", "tag2"],
      "sentiment": "positive" | "neutral" | "negative",
      "readingLevel": "basic" | "intermediate" | "advanced"
    }
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a content analysis assistant. Respond only with valid JSON.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
    });

    const contentText = response.choices?.[0]?.message?.content || '{}';

    let result: Partial<ClassificationResult> = {};

    try {
      result = JSON.parse(contentText);
    } catch (parseErr) {
      logger.error('Failed to parse OpenAI JSON response:', parseErr);
    }

    return {
      categories: result.categories ?? ['Uncategorized'],
      topics: result.topics ?? [],
      sentiment: result.sentiment ?? 'neutral',
      readingLevel: result.readingLevel ?? 'intermediate',
    };
  } catch (error) {
    logger.error('Error classifying content:', error);
    return {
      categories: ['Uncategorized'],
      topics: [],
      sentiment: 'neutral',
      readingLevel: 'intermediate',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};