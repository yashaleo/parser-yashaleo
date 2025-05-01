// src/parser.test.ts
import { parse } from '../../src/services/parser';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

// Mock the fetch function
global.fetch = jest.fn();

jest.mock('jsdom');
jest.mock('@mozilla/readability');

describe('Parser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should parse a valid URL', async () => {
    // Mock implementation
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: jest.fn().mockResolvedValueOnce('<html><body><article>Test content</article></body></html>'),
    });

    const mockArticle = {
      title: 'Test Title',
      content: '<article>Test content</article>',
      textContent: 'Test content',
      excerpt: 'Test excerpt',
    };

    // Mock Readability
    (Readability as jest.Mock).mockImplementation(() => ({
      parse: jest.fn().mockReturnValueOnce(mockArticle),
    }));
    
    // Mock JSDOM
    (JSDOM as unknown as jest.Mock).mockImplementation(() => ({
      window: {
        document: {},
      },
    }));

    const result = await parse('https://example.com');
    
    expect(result).toEqual(mockArticle);
    expect(global.fetch).toHaveBeenCalledWith('https://example.com');
  });

  it('should handle parsing errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: jest.fn().mockResolvedValueOnce('<html><body>Invalid content</body></html>'),
    });

    // Mock Readability to return null
    (Readability as jest.Mock).mockImplementation(() => ({
      parse: jest.fn().mockReturnValueOnce(null),
    }));
    
    // Mock JSDOM
    (JSDOM as unknown as jest.Mock).mockImplementation(() => ({
      window: {
        document: {},
      },
    }));

    await expect(parse('https://example.com')).rejects.toThrow('Failed to parse content');
  });
});