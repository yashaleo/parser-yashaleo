// test/services/article-extractor.test.ts
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { extract } from '@extractus/article-extractor';
import { fetchArticleContent } from '../../src/services/article-extractor.js';

// Mock @extractus/article-extractor
jest.mock(
  '@extractus/article-extractor',
  () => ({
    extract: jest.fn(),
  }),
  { virtual: true }
);

// Mock the logger to prevent console output during tests
jest.mock(
  '../../src/utils/logger.js',
  () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  }),
  { virtual: true }
);

// Mock the config
jest.mock(
  '../../src/config/index.js',
  () => ({
    default: {
      articleExtractor: {
        userAgent: 'Test User Agent',
        timeout: 15000,
      },
    },
  }),
  { virtual: true }
);

describe('Article Extractor Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should extract article content', async () => {
    // Mocked article content
    const mockArticle = {
      title: 'Test Article',
      content: '<div>Test content</div>',
      textContent: 'Test content',
      description: 'Test description',
      author: 'Test Author',
    };

    // Setup the mock to return our mock article
    (extract as jest.Mock).mockResolvedValue(mockArticle);

    // Call the function
    const result = await fetchArticleContent('https://example.com');

    // Verify the result
    expect(result).toEqual(mockArticle);

    // Verify extract was called with expected arguments
    expect(extract).toHaveBeenCalledWith(
      'https://example.com',
      {},
      {
        headers: {
          'User-Agent': 'Test User Agent',
        },
        timeout: 15000,
      }
    );
  });

  it('should handle extraction errors', async () => {
    // Setup the mock to throw an error
    const mockError = new Error('Extraction failed');
    (extract as jest.Mock).mockRejectedValue(mockError);

    // Call the function and expect it to throw
    await expect(fetchArticleContent('https://example.com')).rejects.toThrow('Extraction failed');
  });
});
