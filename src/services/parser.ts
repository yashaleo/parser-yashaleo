import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { fetchWithRetry } from '../utils/http';
import { fetchDynamicContent } from './puppeteer';
import { summarizeContent } from './ai';
import TurndownService from 'turndown';

interface ParserOptions {
  format?: 'html' | 'markdown' | 'text';
  summarize?: boolean;
  usePuppeteer?: boolean;
}

export const parse = async (url: string, options: ParserOptions = {}) => {
  try {
    let html;
    
    if (options.usePuppeteer) {
      // Use Puppeteer for dynamic content
      html = await fetchDynamicContent(url);
    } else {
      // Use regular fetch with retry
      html = await fetchWithRetry(url, {
        maxRetries: 3,
        retryDelay: 1000,
        timeout: 15000,
      });
      
      // Check for common paywall patterns
      if (html.includes('paywall') || html.includes('subscribe') || html.includes('premium content')) {
        // Retry with Puppeteer if paywall detected
        html = await fetchDynamicContent(url);
      }
    }
    
    // Parse using Readability
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    
    if (!article) {
      throw new Error('Failed to parse content');
    }
    
    // Format conversion if needed
    if (options.format === 'markdown') {
      const turndownService = new TurndownService();
      article.content = turndownService.turndown(article.content);
    } else if (options.format === 'text') {
      article.content = article.textContent;
    }
    
    // Add AI summary if requested
    if (options.summarize) {
      article.summary = await summarizeContent(article.textContent);
    }
    
    return article;
  } catch (error: any) {
    console.error(`Error parsing URL ${url}:`, error);
    throw new Error(`Failed to parse URL: ${error.message}`);
  }
};

export const parseHtml = async (url: string, html: string, options: ParserOptions = {}) => {
  try {
    // Parse using Readability
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    
    if (!article) {
      throw new Error('Failed to parse content');
    }
    
    // Format conversion if needed
    if (options.format === 'markdown') {
      const turndownService = new TurndownService();
      article.content = turndownService.turndown(article.content);
    } else if (options.format === 'text') {
      article.content = article.textContent;
    }
    
    // Add AI summary if requested
    if (options.summarize) {
      article.summary = await summarizeContent(article.textContent);
    }
    
    return article;
  } catch (error: any) {
    console.error('Error parsing HTML:', error);
    throw new Error(`Failed to parse HTML: ${error.message}`);
  }
};