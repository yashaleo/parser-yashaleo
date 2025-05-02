// src/services/article-extractor.ts
import { extract } from '@extractus/article-extractor';
import logger from '../utils/logger.js';
import config from '../config/index.js';

/**
 * Fetches content from a URL using article-extractor
 *
 * @param url - The URL to fetch content from
 * @returns The HTML content as a string
 */
export const fetchDynamicContent = async (url: string): Promise<string> => {
  logger.info(`Fetching content from: ${url}`);

  try {
    // Extract article with custom user agent from config
    const article = await extract(
      url,
      {},
      {
        headers: {
          'User-Agent': config.articleExtractor.userAgent,
        },
        timeout: config.articleExtractor.timeout,
      }
    );

    // Return the content or the full HTML if no content was extracted
    if (article && article.content) {
      logger.info(`Successfully extracted content from ${url}`);
      return article.content;
    } else {
      logger.warn(`No content extracted from ${url}`);
      return '';
    }
  } catch (error) {
    logger.error(`Error extracting content from ${url}: ${error}`);
    throw error;
  }
};

/**
 * For direct access to full article data
 *
 * @param url - The URL to fetch content from
 * @returns The complete article object
 */
export const fetchArticleContent = async (url: string): Promise<any> => {
  logger.info(`Fetching article data from: ${url}`);

  try {
    // Extract article with custom user agent from config
    const article = await extract(
      url,
      {},
      {
        headers: {
          'User-Agent': config.articleExtractor.userAgent,
        },
        timeout: config.articleExtractor.timeout,
      }
    );

    return article;
  } catch (error) {
    logger.error(`Error extracting article from ${url}: ${error}`);
    throw error;
  }
};
