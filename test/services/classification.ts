// src/services/classification.ts
import { Configuration, OpenAIApi } from 'openai';

export interface ClassificationResult {
  categories: string[];
  topics: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  readingLevel: 'basic' | 'intermediate' | 'advanced';
}

export const classifyContent = async (title: string, content: string): Promise<ClassificationResult> => {
  if (!process.env.OPENAI_API_KEY) {
    // Return default classification if no API key
    return {
      categories: ['Uncategorized'],
      topics: [],
      sentiment: 'neutral',
      readingLevel: 'intermediate'
    };
  }

  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const openai = new OpenAIApi(configuration);
  
  const prompt = `
    Analyze the following article title and excerpt.
    Title: ${title}
    Content excerpt: ${content.substring(0, 1000)}...
    
    Provide a JSON response with:
    1. categories: Array of up to 3 main categories (like Technology, Politics, Health)
    2. topics: Array of specific topics/tags
    3. sentiment: Overall tone (positive, neutral, or negative)
    4. readingLevel: Estimated reading difficulty (basic, intermediate, or advanced)
  `;

  try {
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a content analysis assistant. Respond only with valid JSON." },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
    });

    const result = JSON.parse(response.data.choices[0]?.message?.content || '{}');
    
    return {
      categories: result.categories || ['Uncategorized'],
      topics: result.topics || [],
      sentiment: result.sentiment || 'neutral',
      readingLevel: result.readingLevel || 'intermediate'
    };
  } catch (error) {
    console.error('Error classifying content:', error);
    return {
      categories: ['Uncategorized'],
      topics: [],
      sentiment: 'neutral',
      readingLevel: 'intermediate'
    };
  }
};