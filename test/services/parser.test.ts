// test/services/parser.test.ts
import { parse, parseHtml } from '../../src/services/parser.js';
import { fetchWithRetry } from '../../src/utils/http.js';
import { fetchDynamicContent } from '../../src/services/article-extractor.js';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock dependencies
jest.mock(
  '../../src/utils/http.js',
  () => ({
    fetchWithRetry: jest.fn(),
  }),
  { virtual: true }
);

jest.mock(
  '../../src/services/article-extractor.js',
  () => ({
    fetchDynamicContent: jest.fn(),
    fetchArticleContent: jest.fn(),
  }),
  { virtual: true }
);

jest.mock('@mozilla/readability', () => ({
  Readability: jest.fn().mockImplementation(() => ({
    parse: jest.fn().mockReturnValue({
      title: 'Test Title',
      content: '<div>Test Content</div>',
      textContent: 'Test Content',
      excerpt: 'Test Excerpt',
    }),
  })),
}));

jest.mock('jsdom', () => ({
  JSDOM: jest.fn().mockImplementation(() => ({
    window: {
      document: {
        body: {
          textContent: 'Test Content',
        },
      },
    },
  })),
}));

jest.mock(
  '../../src/services/ai.js',
  () => ({
    summarizeContent: jest.fn().mockResolvedValue('This is a test summary'),
  }),
  { virtual: true }
);

jest.mock(
  '@extractus/article-extractor',
  () => ({
    extract: jest.fn().mockResolvedValue({
      title: 'Extracted Title',
      content: '<div>Extracted Content</div>',
      textContent: 'Extracted Content',
      description: 'Extracted Description',
      author: 'Test Author',
    }),
  }),
  { virtual: true }
);

jest.mock(
  '../../src/config/index.js',
  () => ({
    default: {
      articleExtractor: {
        enabled: true,
        userAgent: 'Test User Agent',
        timeout: 15000,
      },
    },
  }),
  { virtual: true }
);

describe('Parser Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetchWithRetry as jest.Mock).mockResolvedValue(
      '<html><body><article>Test</article></body></html>'
    );
    (fetchDynamicContent as jest.Mock).mockResolvedValue(
      '<html><body><article>Dynamic Test</article></body></html>'
    );
  });

  describe('parse()', () => {
    it('should parse URL successfully', async () => {
      const result = await parse('https://example.com');
      expect(fetchDynamicContent).toHaveBeenCalledWith('https://example.com');
      expect(result).toEqual(
        expect.objectContaining({
          content: '<html><body><article>Dynamic Test</article></body></html>',
        })
      );
    });

    it('should add AI summary when summarize option is true', async () => {
      const result = await parse('https://example.com', { summarize: true });
      expect(result).toEqual(
        expect.objectContaining({
          content: '<html><body><article>Dynamic Test</article></body></html>',
          summary: 'This is a test summary',
        })
      );
    });

    it('should fall back to direct HTTP fetch when article-extractor fails', async () => {
      (fetchDynamicContent as jest.Mock).mockResolvedValueOnce('');
      await parse('https://example.com');
      expect(fetchWithRetry).toHaveBeenCalledWith('https://example.com');
    });
  });

  describe('parseHtml()', () => {
    it('should parse HTML successfully', async () => {
      const result = await parseHtml(
        '<html><body><article>Test</article></body></html>',
        'https://example.com'
      );
      expect(result).toEqual(
        expect.objectContaining({
          title: 'Test Title',
          content: '<div>Test Content</div>',
        })
      );
    });

    it('should add AI summary when summarize option is true', async () => {
      const result = await parseHtml(
        '<html><body><article>Test</article></body></html>',
        'https://example.com',
        { summarize: true }
      );
      expect(result).toEqual(
        expect.objectContaining({
          title: 'Test Title',
          summary: 'This is a test summary',
        })
      );
    });

    it('should handle failed parsing gracefully', async () => {
      require('@mozilla/readability').Readability.mockImplementationOnce(() => ({
        parse: jest.fn().mockReturnValue(null),
      }));
      const result = await parseHtml(
        '<html><body>Invalid Content</body></html>',
        'https://example.com'
      );
      expect(result).toEqual(
        expect.objectContaining({
          title: '',
          content: '<html><body>Invalid Content</body></html>',
        })
      );
    });
  });
});
