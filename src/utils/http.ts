// src/utils/http.ts

import fetch from 'node-fetch';
import type { RequestInit } from 'node-fetch';

interface RetryOptions {
  maxRetries: number;
  retryDelay: number;
  timeout: number;
}

/**
 * Fetches content from a URL with retry and timeout support
 */
export const fetchWithRetry = async (
  url: string,
  options: RetryOptions = { maxRetries: 3, retryDelay: 1000, timeout: 15000 },
  requestInit: RequestInit = {}
): Promise<string> => {
  let lastError: unknown = new Error('Unknown fetch error');

  for (let attempt = 0; attempt < options.maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), options.timeout);

      // Fix: Use correct headers type that's compatible with node-fetch
      const headers = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        ...(requestInit.headers || {}),
      };

      const response = await fetch(url, {
        ...requestInit,
        signal: controller.signal,
        headers,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }

      return await response.text();
    } catch (error: unknown) {
      lastError = error;

      // Don't retry on AbortError or bad URLs
      if (
        (error as Error).name === 'AbortError' ||
        (error instanceof TypeError && error.message.includes('Invalid URL'))
      ) {
        throw error;
      }

      if (attempt < options.maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, options.retryDelay));
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Unknown error during fetchWithRetry');
}