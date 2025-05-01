import { parse, parseHtml } from '../../src/services/parser.js';
import { fetchWithRetry } from '../../src/utils/http.js';
import { fetchDynamicContent } from '../../src/services/puppeteer.js';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock dependencies
jest.mock('../../src/utils/http', () => ({
  fetchWithRetry: jest.fn(),
}));

jest.mock('../../src/utils/http.js', () => ({
  fetchWithRetry: jest.fn(),
}), { virtual: true });

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
      document: {},
    },
  })),
}));

jest.mock('../../src/services/ai', () => ({
  summarizeContent: jest.fn().mockResolvedValue('This is a test summary'),
}));

describe('Parser Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetchWithRetry as jest.Mock).mockResolvedValue('<html><body><article>Test</article></body></html>');
    (fetchDynamicContent as jest.Mock).mockResolvedValue('<html><body><article>Dynamic Test</article></body></html>');
  });

  describe('parse()', () => {
    it('should parse URL successfully', async () => {
      const result = await parse('https://example.com');
      
      expect(fetchWithRetry).toHaveBeenCalledWith(
        'https://example.com',
        expect.any(Object)
      );
      expect(result).toEqual(expect.objectContaining({
        title: 'Test Title',
        content: '<div>Test Content</div>',
      }));
    });
    
    it('should use puppeteer for dynamic content when specified', async () => {
      await parse('https://example.com', { usePuppeteer: true });
      
      expect(fetchDynamicContent).toHaveBeenCalledWith('https://example.com');
      expect(fetchWithRetry).not.toHaveBeenCalled();
    });
    
    it('should add AI summary when summarize option is true', async () => {
      const result = await parse('https://example.com', { summarize: true });
      
      expect(result).toEqual(expect.objectContaining({
        title: 'Test Title',
        summary: 'This is a test summary',
      }));
    });
    
    it('should throw error when parsing fails', async () => {
      require('@mozilla/readability').Readability.mockImplementationOnce(() => ({
        parse: jest.fn().mockReturnValue(null),
      }));
      
      await expect(parse('https://example.com')).rejects.toThrow('Failed to parse content');
    });
  });
  
  describe('parseHtml()', () => {
    it('should parse HTML successfully', async () => {
      const result = await parseHtml(
        'https://example.com', 
        '<html><body><article>Test</article></body></html>'
      );
      
      expect(result).toEqual(expect.objectContaining({
        title: 'Test Title',
        content: '<div>Test Content</div>',
      }));
    });
    
    it('should add AI summary when summarize option is true', async () => {
      const result = await parseHtml(
        'https://example.com',
        '<html><body><article>Test</article></body></html>',
        { summarize: true }
      );
      
      expect(result).toEqual(expect.objectContaining({
        title: 'Test Title',
        summary: 'This is a test summary',
      }));
    });
    
    it('should throw error when parsing fails', async () => {
      require('@mozilla/readability').Readability.mockImplementationOnce(() => ({
        parse: jest.fn().mockReturnValue(null),
      }));
      
      await expect(parseHtml(
        'https://example.com',
        '<html><body>Invalid Content</body></html>'
      )).rejects.toThrow('Failed to parse content');
    });
  });
});