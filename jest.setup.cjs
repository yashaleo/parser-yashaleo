// jest.setup.cjs
// Make fetch available to all tests
global.fetch = jest.fn();

// Mock OpenAI
jest.mock('openai', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
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
    })),
  };
});
