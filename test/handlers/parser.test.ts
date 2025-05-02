// test/handlers/parser.test.ts
import handler from '../../src/handlers/parser.js';
import { parse } from '../../src/services/parser.js';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock the parse function
jest.mock(
  '../../src/services/parser.js',
  () => ({
    parse: jest.fn(),
  }),
  { virtual: true }
);

jest.mock(
  '../../src/utils/logger.js',
  () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  }),
  { virtual: true }
);

describe('Parser Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return error when URL is missing', async () => {
    const event = { queryStringParameters: {} };

    const response = await handler(event as any, {} as any);

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body).message).toContain('Missing URL parameter');
  });

  it('should return error for invalid URL', async () => {
    const event = { queryStringParameters: { url: 'invalid-url' } };

    const response = await handler(event as any, {} as any);

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body).message).toContain('Invalid URL format');
  });

  it('should successfully parse URL and return result', async () => {
    const mockResult = {
      title: 'Test Title',
      content: '<div>Test Content</div>',
      textContent: 'Test Content',
      excerpt: 'Test Excerpt',
    };

    (parse as jest.Mock).mockResolvedValueOnce(mockResult);

    const event = {
      queryStringParameters: {
        url: 'https://example.com',
        format: 'html',
        summarize: 'true',
      },
    };

    const response = await handler(event as any, {} as any);

    expect(response.statusCode).toBe(200);
    expect(parse).toHaveBeenCalledWith('https://example.com', {
      format: 'html',
      summarize: true,
    });
    expect(JSON.parse(response.body)).toEqual(mockResult);
  });

  it('should handle parsing errors', async () => {
    (parse as jest.Mock).mockRejectedValueOnce(new Error('Parse error'));

    const event = {
      queryStringParameters: {
        url: 'https://example.com',
      },
    };

    const response = await handler(event as any, {} as any);

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body).message).toBe('Parse error');
  });
});
