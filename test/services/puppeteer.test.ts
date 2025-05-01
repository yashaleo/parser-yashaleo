// test/services/puppeteer.test.ts
import puppeteer from 'puppeteer';
import { fetchDynamicContent } from '../../src/services/puppeteer';

// Mock the logger to prevent console output during tests
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

// Mock puppeteer
jest.mock('puppeteer');

describe('Puppeteer Service', () => {
  it('should fetch dynamic content', async () => {
    // Mock browser and page
    const mockPage = {
      goto: jest.fn().mockResolvedValue({}),
      setUserAgent: jest.fn(),
      setExtraHTTPHeaders: jest.fn(),
      waitForSelector: jest.fn().mockResolvedValue({}),
      evaluate: jest.fn(),
      content: jest.fn().mockResolvedValue('<html><body>Dynamic content</body></html>')
    };
    
    const mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockResolvedValue({})
    };
    
    jest.spyOn(puppeteer, 'launch').mockResolvedValue(mockBrowser as any);
    
    const result = await fetchDynamicContent('https://example.com');
    
    expect(result).toBe('<html><body>Dynamic content</body></html>');
    expect(puppeteer.launch).toHaveBeenCalled();
    expect(mockPage.goto).toHaveBeenCalledWith('https://example.com', expect.any(Object));
  });
});