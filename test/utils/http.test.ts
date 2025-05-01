import { fetchWithRetry } from '../../src/utils/http';

// Provide safe fallbacks if running in environments without AbortController or DOMException
if (typeof global.AbortController === 'undefined') {
  global.AbortController = class {
    signal = {};
    abort = jest.fn();
  };
}
if (typeof global.DOMException === 'undefined') {
  global.DOMException = class extends Error {
    constructor(message: string, name: string) {
      super(message);
      this.name = name;
    }
  };
}

describe('HTTP Utilities', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  describe('fetchWithRetry', () => {
    it('should fetch successfully on first attempt', async () => {
      const mockResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue('<html>Test</html>'),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await fetchWithRetry('https://example.com');

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          signal: expect.anything(),
          headers: expect.objectContaining({
            'User-Agent': expect.any(String),
          }),
        })
      );
      expect(result).toBe('<html>Test</html>');
    });

    it('should retry on network failure', async () => {
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValue('<html>Test</html>'),
        });

      const promise = fetchWithRetry('https://example.com', {
        maxRetries: 3,
        retryDelay: 1000,
        timeout: 5000,
      });

      jest.advanceTimersByTime(1000);
      await Promise.resolve();

      const result = await promise;

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(result).toBe('<html>Test</html>');
    });

    it('should throw error after max retries', async () => {
      const error = new Error('Network error');
      (global.fetch as jest.Mock)
        .mockRejectedValue(error);

      const promise = fetchWithRetry('https://example.com', {
        maxRetries: 3,
        retryDelay: 1000,
        timeout: 5000,
      });

      jest.advanceTimersByTime(3000);
      await Promise.resolve();

      await expect(promise).rejects.toThrow('Network error');
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should abort fetch if timeout is reached', async () => {
      const abortError = new DOMException('The operation was aborted', 'AbortError');

      (global.fetch as jest.Mock).mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(abortError), 6000);
        });
      });

      const promise = fetchWithRetry('https://example.com', {
        maxRetries: 1,
        retryDelay: 1000,
        timeout: 5000,
      });

      jest.advanceTimersByTime(5000);
      await Promise.resolve();

      await expect(promise).rejects.toThrow('AbortError');
    });

    it('should not retry on invalid URL errors', async () => {
      const typeError = new TypeError('Invalid URL');
      (global.fetch as jest.Mock).mockRejectedValueOnce(typeError);

      await expect(fetchWithRetry('invalid-url')).rejects.toThrow('Invalid URL');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should throw error on non-OK response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(fetchWithRetry('https://example.com')).rejects.toThrow(
        'HTTP error 404: Not Found'
      );
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });
});