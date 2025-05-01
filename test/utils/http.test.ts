import { fetchWithRetry } from '../../src/utils/http.js';
import fetch from 'node-fetch';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Create a properly typed mock for fetch
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;

// Replace the global fetch with our mock
global.fetch = mockFetch;

describe('HTTP Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('fetchWithRetry', () => {
    it('should fetch successfully on first attempt', async () => {
      const mockResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue('<html>Test</html>'),
      };

      mockFetch.mockResolvedValueOnce(mockResponse as any);

      const result = await fetchWithRetry('https://example.com');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.any(String),
          }),
        })
      );
      expect(result).toBe('<html>Test</html>');
    });

    it('should retry on network failure', async () => {
      jest.spyOn(global, 'setTimeout').mockImplementation((fn) => {
        setTimeout(fn as Function, 0);
        return 1 as unknown as NodeJS.Timeout;
      });

      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValue('<html>Test</html>'),
        } as any);

      const result = await fetchWithRetry('https://example.com', {
        maxRetries: 3,
        retryDelay: 1, 
        timeout: 5000,
      });

      expect(result).toBe('<html>Test</html>');
    });

    it('should not retry on invalid URL errors', async () => {
      const typeError = new TypeError('Invalid URL');
      mockFetch.mockRejectedValueOnce(typeError);

      await expect(fetchWithRetry('invalid-url')).rejects.toThrow(/Invalid URL/);
    });

    it('should throw error on non-OK response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as any);

      await expect(fetchWithRetry('https://example.com')).rejects.toThrow(
        /HTTP error 404: Not Found/
      );
    });
  });
});