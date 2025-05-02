// src/services/parser.ts - Fixed version with addressed linting warnings
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { extract } from '@extractus/article-extractor';
import { fetchWithRetry } from '../utils/http.js';
import { summarizeContent } from './ai.js';
import logger from '../utils/logger.js';
import config from '../config/index.js';
import { getSourceConfig } from '../config/sources.js';

/**
 * Structure for cleaned article content
 */
interface CleanedArticle {
  title: string;
  content: string;
  textContent: string;
  excerpt: string;
  author?: string;
  publishedDate?: string;
  url: string;
  structure?: {
    sections: Array<{
      heading?: string;
      content: string;
      level?: number;
    }>;
  };
  summary?: string;
}

/**
 * Parsing options interface
 */
interface ParserOptions {
  format?: 'html' | 'markdown' | 'text';
  summarize?: boolean;
  [key: string]: unknown; // Allow for additional options
}

/**
 * Clean HTML content by removing navigation, ads, and other non-content elements
 */
function cleanHtmlContent(html: string, url: string): string {
  // Get site-specific configuration
  const sourceConfig = getSourceConfig(url);

  const dom = new JSDOM(html);
  const document = dom.window.document;

  // Remove known navigation and footer elements
  const elementsToRemove = [
    'nav',
    'header',
    'footer',
    'aside',
    '[role="navigation"]',
    '[class*="nav"]',
    '[class*="menu"]',
    '[class*="sidebar"]',
    '[id*="nav"]',
    '[id*="menu"]',
    '[id*="sidebar"]',
    '[class*="footer"]',
    '[id*="footer"]',
    '[class*="copyright"]',
    '[class*="banner"]',
    '[class*="ad-"]',
    '[class*="advertisement"]',
    'script',
    'style',
    'iframe',
  ];

  elementsToRemove.forEach(selector => {
    try {
      document.querySelectorAll(selector).forEach(el => {
        // Don't remove if it might contain main content
        if (!el.textContent || el.textContent.length < 1000) {
          el.remove();
        }
      });
    } catch (error) {
      // Continue if selector is invalid
    }
  });

  // Apply site-specific cleaners if available
  if (sourceConfig.selectors && sourceConfig.selectors.content) {
    // Try to get content using site-specific selector
    const contentElement = document.querySelector(sourceConfig.selectors.content);
    if (contentElement) {
      return contentElement.innerHTML;
    }
  }

  return document.body.innerHTML;
}

/**
 * Extract structured sections from HTML content
 */
function extractSections(
  html: string
): Array<{ heading?: string; content: string; level?: number }> {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const sections = [];

  // Find all headings
  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');

  if (headings.length === 0) {
    // No headings found, return entire content as one section
    return [{ content: html }];
  }

  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    const level = parseInt(heading.tagName.substring(1), 10);
    const headingText = heading.textContent?.trim();

    // Find all content until the next heading
    let content = '';
    let nextNode = heading.nextSibling;

    while (
      nextNode &&
      (nextNode.nodeType !== 1 || !/^h[1-6]$/i.test((nextNode as Element).tagName))
    ) {
      if (nextNode.nodeType === 1) {
        content += (nextNode as Element).outerHTML;
      } else if (nextNode.nodeType === 3 && nextNode.textContent?.trim()) {
        content += nextNode.textContent;
      }

      nextNode = nextNode.nextSibling;
    }

    sections.push({
      heading: headingText,
      content: content,
      level: level,
    });
  }

  return sections;
}

/**
 * Preserve code blocks and formatting in HTML
 */
function preserveFormattedContent(html: string): string {
  const dom = new JSDOM(html);
  const document = dom.window.document;

  // Ensure code blocks are properly preserved
  document.querySelectorAll('pre, code').forEach(el => {
    el.innerHTML = el.innerHTML.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  });

  // Ensure lists are properly formatted
  document.querySelectorAll('ul, ol').forEach(list => {
    const items = list.querySelectorAll('li');
    items.forEach(item => {
      if (
        !item.textContent?.trim().endsWith('.') &&
        !item.textContent?.trim().endsWith(':') &&
        !item.textContent?.trim().endsWith('!') &&
        !item.textContent?.trim().endsWith('?')
      ) {
        item.innerHTML = item.innerHTML.trim() + '.';
      }
    });
  });

  return document.body.innerHTML;
}

/**
 * Extract metadata from HTML
 */
function extractMetadata(
  html: string,
  _url: string
): {
  author?: string;
  publishedDate?: string;
} {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const metadata: { author?: string; publishedDate?: string } = {};

  // Try to extract author
  const authorSelectors = [
    'meta[name="author"]',
    'meta[property="article:author"]',
    'meta[property="og:author"]',
    'a[rel="author"]',
    '.author',
    '.byline',
    '[class*="author"]',
    '[class*="byline"]',
  ];

  for (const selector of authorSelectors) {
    try {
      const authorElement = document.querySelector(selector);
      if (authorElement) {
        if (authorElement.tagName.toLowerCase() === 'meta') {
          // Fix: Convert null to undefined
          const content = authorElement.getAttribute('content');
          metadata.author = content || undefined;
        } else {
          // Fix: Convert null to undefined
          metadata.author = authorElement.textContent || undefined;
        }

        if (metadata.author) {
          metadata.author = metadata.author.trim();
          break;
        }
      }
    } catch (error) {
      // Continue to next selector
    }
  }

  // Try to extract published date
  const dateSelectors = [
    'meta[name="date"]',
    'meta[property="article:published_time"]',
    'meta[property="og:published_time"]',
    'time',
    '[class*="date"]',
    '[class*="time"]',
    '[class*="published"]',
  ];

  for (const selector of dateSelectors) {
    try {
      const dateElement = document.querySelector(selector);
      if (dateElement) {
        if (dateElement.tagName.toLowerCase() === 'meta') {
          // Fix: Convert null to undefined
          const content = dateElement.getAttribute('content');
          metadata.publishedDate = content || undefined;
        } else if (dateElement.tagName.toLowerCase() === 'time') {
          // Fix: Handle potential null values
          const datetime = dateElement.getAttribute('datetime');
          metadata.publishedDate = datetime || dateElement.textContent || undefined;
        } else {
          // Fix: Convert null to undefined
          metadata.publishedDate = dateElement.textContent || undefined;
        }

        if (metadata.publishedDate) {
          metadata.publishedDate = metadata.publishedDate.trim();
          break;
        }
      }
    } catch (error) {
      // Continue to next selector
    }
  }

  return metadata;
}

/**
 * Enhanced parse method with better content extraction and cleaning
 */
export const parse = async (url: string, options: ParserOptions = {}): Promise<CleanedArticle> => {
  logger.info(`Parsing URL: ${url}`);

  try {
    let articleContent: Partial<CleanedArticle> = {};
    let metadata = {};

    // Try article-extractor first if enabled
    if (config.articleExtractor.enabled) {
      try {
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

        if (article && article.content) {
          logger.info(`Successfully extracted content from ${url}`);

          // Clean the extracted content
          const cleanedHtml = cleanHtmlContent(article.content, url);
          // Preserve formatting in code blocks and lists
          const formattedHtml = preserveFormattedContent(cleanedHtml);

          articleContent = {
            title: article.title || '',
            content: formattedHtml,
            textContent: article.textContent || extractTextFromHtml(formattedHtml),
            excerpt: article.description || '',
            author: article.author,
            publishedDate: article.published,
            url: url,
          };

          // Extract structured sections
          const sections = extractSections(formattedHtml);
          if (sections.length > 0) {
            articleContent.structure = { sections };
          }
        }
      } catch (error) {
        logger.warn(`Article extractor failed for ${url}: ${error}`);
        // Continue to fallback method
      }
    }

    // Fall back to direct fetch + Readability if article-extractor failed
    if (!articleContent.content) {
      logger.info(`Falling back to HTTP fetch for ${url}`);

      const html = await fetchWithRetry(url);
      const cleanedHtml = cleanHtmlContent(html, url);

      // Extract additional metadata
      metadata = extractMetadata(html, url);

      // Parse with Readability
      const dom = new JSDOM(cleanedHtml, { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();

      if (!article) {
        logger.warn(`Failed to parse article from ${url}`);
        return {
          title: '',
          content: cleanedHtml,
          textContent: extractTextFromHtml(cleanedHtml),
          excerpt: '',
          url: url,
          ...metadata,
        };
      }

      // Preserve formatting in code blocks and lists
      const formattedHtml = preserveFormattedContent(article.content);

      articleContent = {
        title: article.title || '',
        content: formattedHtml,
        textContent: article.textContent || '',
        excerpt: article.excerpt || '',
        url: url,
        ...metadata,
      };

      // Extract structured sections
      const sections = extractSections(formattedHtml);
      if (sections.length > 0) {
        articleContent.structure = { sections };
      }
    }

    // Generate summary if requested
    if (options.summarize && articleContent.textContent) {
      logger.info(`Generating summary for ${url}`);
      articleContent.summary = await summarizeContent(articleContent.textContent);
    }

    // Ensure all required fields are present
    return {
      title: articleContent.title || '',
      content: articleContent.content || '',
      textContent: articleContent.textContent || '',
      excerpt: articleContent.excerpt || '',
      url: url,
      author: articleContent.author,
      publishedDate: articleContent.publishedDate,
      structure: articleContent.structure,
      summary: articleContent.summary,
    };
  } catch (error) {
    logger.error(`Error parsing ${url}: ${error}`);
    throw error;
  }
};

/**
 * Extract text content from HTML without tags
 */
function extractTextFromHtml(html: string): string {
  const dom = new JSDOM(html);
  return dom.window.document.body.textContent?.trim() || '';
}

/**
 * Parse HTML content with enhanced cleaning
 */
export const parseHtml = async (
  html: string,
  url: string,
  options: ParserOptions = {}
): Promise<CleanedArticle> => {
  logger.info(`Parsing HTML from ${url}`);

  try {
    // Clean HTML before parsing
    const cleanedHtml = cleanHtmlContent(html, url);
    const formattedHtml = preserveFormattedContent(cleanedHtml);

    // Extract metadata
    const metadata = extractMetadata(html, url);

    // Parse with Readability
    const dom = new JSDOM(formattedHtml, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      logger.warn(`Failed to parse article from ${url}`);
      return {
        title: '',
        content: cleanedHtml,
        textContent: extractTextFromHtml(cleanedHtml),
        excerpt: '',
        url: url,
        ...metadata,
      };
    }

    const result: CleanedArticle = {
      title: article.title || '',
      content: article.content || '',
      textContent: article.textContent || '',
      excerpt: article.excerpt || '',
      url: url,
      ...metadata,
    };

    // Extract structured sections
    const sections = extractSections(article.content);
    if (sections.length > 0) {
      result.structure = { sections };
    }

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
