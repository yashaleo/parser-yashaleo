// jest.setup.ts

// Make fetch available to all tests by default
// Don't pre-mock fetch globally — just ensure it's defined
if (!global.fetch) {
    global.fetch = jest.fn();
  }

// Mock OpenAI client
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: 'Mocked AI summary response.',
              },
            },
          ],
        }),
      },
    },
  })),
}));