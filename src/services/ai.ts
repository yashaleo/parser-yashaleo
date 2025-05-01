// src/services/ai.ts
import { Configuration, OpenAIApi } from 'openai';

export const summarizeContent = async (content: string): Promise<string> => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const openai = new OpenAIApi(configuration);

  try {
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        { 
          role: "system", 
          content: "You are a helpful assistant that summarizes content. Provide a concise summary of the following text." 
        },
        { 
          role: "user", 
          content: content.slice(0, 8000) // GPT-3.5 token limit safety
        }
      ],
      max_tokens: 300,
    });

    return completion.data.choices[0]?.message?.content || "No summary available";
  } catch (error) {
    console.error('Error generating summary:', error);
    return "Error generating summary";
  }
};