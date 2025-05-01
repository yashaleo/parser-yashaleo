import { Readability } from '@mozilla/readability';
import parseHtml from '../../src/handlers/parse-html.js';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

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
  JSDOM: jest.fn().mockImplementation(html => ({
    window: {
      document: {
        documentElement: {
          innerHTML: html,
        },
      },
    },
  })),
}));

describe('parseHtml handler', () => {
  it('should return error when body is missing', async () => {
    const response = await parseHtml({ body: null } as any, {} as any);

    expect(response.statusCode).toBe(500);
    expect(response.body).toContain('Missing request body');
  });

  it('should return error when url or html is missing', async () => {
    const response = await parseHtml(
      { body: JSON.stringify({ url: 'https://example.com' }) } as any,
      {} as any
    );

    expect(response.statusCode).toBe(500);
    expect(response.body).toContain('URL and HTML must be provided');
  });

  it('should parse HTML and return result', async () => {
    const response = await parseHtml(
      {
        body: JSON.stringify({
          url: 'https://example.com',
          html: '<html><body><article>Test</article></body></html>',
        }),
      } as any,
      {} as any
    );

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Test Title');
    expect(response.body).toContain('Test Content');
  });

  it('should handle parsing errors', async () => {
    // Force Readability to return null just for this test
    const mockReadability = jest.mocked(Readability);
    mockReadability.mockImplementationOnce(() => ({
      parse: jest.fn().mockReturnValue(null),
    }));

    const response = await parseHtml(
      {
        body: JSON.stringify({
          url: 'https://example.com',
          html: '<html><body>Invalid Content</body></html>',
        }),
      } as any,
      {} as any
    );

    expect(response.statusCode).toBe(500);
    expect(response.body).toContain('Failed to parse HTML');
  });
});