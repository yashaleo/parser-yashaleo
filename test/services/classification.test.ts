import { classifyContent } from '../../src/services/classification.js';
import OpenAI from 'openai';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock the OpenAI module
jest.mock('openai');
jest.mock(
  '../../src/utils/logger.js',
  () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  }),
  { virtual: true }
);

describe('Content Classification Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return default classification when no API key is available', async () => {
    // Backup original env
    const originalEnv = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = '';

    const result = await classifyContent('Test Title', 'Test Content');

    expect(result).toEqual({
      categories: ['Uncategorized'],
      topics: [],
      sentiment: 'neutral',
      readingLevel: 'intermediate',
    });

    // Restore env
    process.env.OPENAI_API_KEY = originalEnv;
  });

  it('should properly classify content when API key is available', async () => {
    // Set API key for test
    process.env.OPENAI_API_KEY = 'test-key';

    // Mock chat.completions.create instead of the whole OpenAI class
    const mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    categories: ['Technology', 'AI'],
                    topics: ['Machine Learning', 'NLP'],
                    sentiment: 'positive',
                    readingLevel: 'advanced',
                  }),
                },
              },
            ],
          }),
        },
      },
    };

    // Override just the mock implementation for this test
    (OpenAI as jest.Mock).mockImplementation(() => mockOpenAI);

    const result = await classifyContent('AI Progress', 'New advances in AI technology...');

    expect(result).toEqual({
      categories: ['Technology', 'AI'],
      topics: ['Machine Learning', 'NLP'],
      sentiment: 'positive',
      readingLevel: 'advanced',
    });

    expect(mockOpenAI.chat.completions.create).toHaveBeenCalled();
  });
});
