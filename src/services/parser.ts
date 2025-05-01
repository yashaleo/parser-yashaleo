// src/services/parser.ts
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { extract } from '@extractus/article-extractor';
import { fetchWithRetry } from '../utils/http.js';
import { summarizeContent } from './ai.js';
import logger from '../utils/logger.js';
import config from '../config/index.js';

/**
 * Extract text content from HTML without tags
 *
 * @param html - HTML content
 * @returns Plain text
 */
function extractTextFromHtml(html: string): string {
  const dom = new JSDOM(html);
  return dom.window.document.body.textContent?.trim() || '';
}

/**
 * Extract main content from a web page
 *
 * @param url - URL to parse
 * @param options - Parsing options
 * @returns Parsed content object
 */
export const parse = async (url: string, options: any = {}): Promise<any> => {
  logger.info(`Parsing URL: ${url}`);
  
  try {
    // Check if article-extractor is enabled
    if (config.articleExtractor.enabled) {
      // Fetch content using article-extractor
      const article = await extract(url, {}, {
        headers: {
          'User-Agent': config.articleExtractor.userAgent
        },
        timeout: config.articleExtractor.timeout
      });
      
      if (article && article.content) {
        logger.info(`Successfully extracted content from ${url}`);
        
        // Prepare the result object
        const result: any = {
          title: article.title || '',
          content: article.content || '',
          textContent: article.textContent || extractTextFromHtml(article.content),
          excerpt: article.description || '',
          author: article.author || '',
          url: url
        };
        
        // Generate summary if requested
        if (options.summarize) {
          logger.info(`Generating summary for ${url}`);
          result.summary = await summarizeContent(result.textContent);
        }
        
        return result;
      }
    }
    
    // Fall back to direct HTTP fetch if article-extractor is disabled or failed
    logger.info(`Falling back to HTTP fetch for ${url}`);
    const html = await fetchWithRetry(url);
    return parseHtml(html, url, options);
  } catch (error) {
    logger.error(`Error parsing ${url}: ${error}`);
    throw error;
  }
};

/**
 * Parse HTML content using Readability
 *
 * @param html - HTML content to parse
 * @param url - Original URL
 * @param options - Parsing options
 * @returns Parsed content object
 */
export const parseHtml = async (html: string, url: string, options: any = {}): Promise<any> => {
  logger.info(`Parsing HTML from ${url}`);
  
  try {
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    
    if (!article) {
      logger.warn(`Failed to parse article from ${url}`);
      return {
        title: '',
        content: html,
        textContent: extractTextFromHtml(html),
        excerpt: '',
        url: url
      };
    }
    
    const result: any = {
      title: article.title || '',
      content: article.content || '',
      textContent: article.textContent || '',
      excerpt: article.excerpt || '',
      url: url
    };
    
    // Generate summary if requested
    if (options.summarize) {
      logger.info(`Generating summary for ${url}`);
      result.summary = await summarizeContent(result.textContent);
    }
    
    return result;
  } catch (error) {
    logger.error(`Error parsing HTML from ${url}: ${error}`);
    throw error;
  }
};