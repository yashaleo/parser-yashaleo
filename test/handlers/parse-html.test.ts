import parseHtml from '../../src/parse-html';

// Mock dependencies
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

describe('parseHtml handler', () => {
  let mockCallback: jest.Mock;
  
  beforeEach(() => {
    mockCallback = jest.fn();
  });
  
  it('should return error when body is missing', async () => {
    await parseHtml({ body: null } as any, {} as any, mockCallback);
    
    expect(mockCallback).toHaveBeenCalledWith(
      null,
      expect.objectContaining({
        statusCode: 500,
        body: expect.stringContaining('Missing request body'),
      })
    );
  });
  
  it('should return error when url or html is missing', async () => {
    await parseHtml(
      { body: JSON.stringify({ url: 'https://example.com' }) } as any, 
      {} as any, 
      mockCallback
    );
    
    expect(mockCallback).toHaveBeenCalledWith(
      null,
      expect.objectContaining({
        statusCode: 500,
        body: expect.stringContaining('URL and HTML must be provided'),
      })
    );
  });
  
  it('should parse HTML and return result', async () => {
    await parseHtml(
      { 
        body: JSON.stringify({ 
          url: 'https://example.com', 
          html: '<html><body><article>Test</article></body></html>' 
        }) 
      } as any, 
      {} as any, 
      mockCallback
    );
    
    expect(mockCallback).toHaveBeenCalledWith(
      null,
      expect.objectContaining({
        statusCode: 200,
        body: expect.stringContaining('Test Title'),
      })
    );
  });
  
  it('should handle parsing errors', async () => {
    // Override mock to return null for this test only
    require('@mozilla/readability').Readability.mockImplementationOnce(() => ({
      parse: jest.fn().mockReturnValue(null),
    }));
    
    await parseHtml(
      { 
        body: JSON.stringify({ 
          url: 'https://example.com', 
          html: '<html><body>Invalid Content</body></html>' 
        }) 
      } as any, 
      {} as any, 
      mockCallback
    );
    
    expect(mockCallback).toHaveBeenCalledWith(
      null,
      expect.objectContaining({
        statusCode: 500,
        body: expect.stringContaining('Failed to parse HTML'),
      })
    );
  });
});