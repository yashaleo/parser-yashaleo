// src/utils/http.ts
interface RetryOptions {
    maxRetries: number;
    retryDelay: number;
    timeout: number;
  }
  
  export const fetchWithRetry = async (
    url: string, 
    options: RetryOptions = { maxRetries: 3, retryDelay: 1000, timeout: 15000 }
  ): Promise<string> => {
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt < options.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), options.timeout);
        
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          },
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
        }
        
        return await response.text();
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on certain errors
        if (error.name === 'AbortError' || (error instanceof TypeError && error.message.includes('Invalid URL'))) {
          throw error;
        }
        
        // If this is not the last attempt, wait before retrying
        if (attempt < options.maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, options.retryDelay));
        }
      }
    }
    
    throw lastError || new Error('Failed to fetch after multiple attempts');
  };