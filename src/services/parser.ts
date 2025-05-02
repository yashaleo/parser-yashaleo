// src/services/parser.ts - Enhanced version with improved error handling
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
  error?: string;
  parsingMethod?: string;
  processingTime?: number;
}

/**
 * Parsing options interface
 */
interface ParserOptions {
  format?: 'html' | 'markdown' | 'text';
  summarize?: boolean;
  forceExtractor?: boolean;
  timeout?: number;
  [key: string]: unknown; // Allow for additional options
}

/**
 * Decode HTML entities that might be double-encoded
 */
function decodeHtmlEntities(html: string): string {
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/**
 * Safely process HTML to prevent memory issues with very large content
 */
function safelyProcessHtml(html: string): string {
  // If HTML is too large, sample it or truncate it to prevent memory issues
  if (html.length > 5000000) {
    // 5MB
    logger.warn(`HTML content is very large (${html.length} bytes), truncating for safety`);

    // Get the first 1MB and last 1MB with markers
    const firstPart = html.substring(0, 1000000);
    const lastPart = html.substring(html.length - 1000000);

    return `${firstPart}<div class="truncated-content">Content truncated due to size</div>${lastPart}`;
  }

  return html;
}

/**
 * Apply special cleaning for known problematic sites
 */
function applySpecialCleaning(html: string, domain: string): string {
  if (domain.includes('medium.com')) {
    // Special handling for Medium
    return html.replace(/<div class="[^"]*highlight[^"]*"[^>]*>([\s\S]*?)<\/div>/gi, '');
  }

  if (domain.includes('substack')) {
    // Remove Substack specific clutter
    return html
      .replace(/<div class="[^"]*captioned-image[^"]*"[^>]*>([\s\S]*?)<\/div>/gi, '')
      .replace(/<div class="[^"]*subscription-widget[^"]*"[^>]*>([\s\S]*?)<\/div>/gi, '');
  }

  return html;
}

/**
 * Simplify HTML to improve parsing chances
 */
function simplifyHtml(html: string): string {
  return (
    html
      // Remove all attributes except href, src, and basic formatting
      .replace(/<([a-z][a-z0-9]*)\s(?:[^>]*?\s)?([^>]*?)>/gi, function (match, tag, attrs) {
        const href = attrs.match(/href\s*=\s*['"]([^'"]*)['"]/i);
        const src = attrs.match(/src\s*=\s*['"]([^'"]*)['"]/i);
        const className = attrs.match(/class\s*=\s*['"]([^'"]*)['"]/i);
        let newAttrs = '';
        if (href) newAttrs += ` href="${href[1]}"`;
        if (src) newAttrs += ` src="${src[1]}"`;
        if (className && (className[1].includes('content') || className[1].includes('article'))) {
          newAttrs += ` class="${className[1]}"`;
        }
        return `<${tag}${newAttrs}>`;
      })
      // Fix double-encoded entities
      .replace(/&amp;lt;/g, '&lt;')
      .replace(/&amp;gt;/g, '&gt;')
      .replace(/&amp;amp;/g, '&amp;')
  );
}

/**
 * Extract content using regex as a last resort
 */
function extractContentWithRegex(html: string): string {
  try {
    // Remove script, style tags
    const content = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

    // Focus on main content blocks
    const mainContentRegex =
      /<article[^>]*>([\s\S]*?)<\/article>|<main[^>]*>([\s\S]*?)<\/main>|<div[^>]*class=['"](?:post|content|article|entry|blog)[^'"]*['"][^>]*>([\s\S]*?)<\/div>/gi;
    const matches = [...content.matchAll(mainContentRegex)];

    if (matches.length > 0) {
      // Get the longest match that likely contains the main content
      const longestMatch = matches.reduce((prev, current) => {
        const prevText = prev[0] || '';
        const currentText = current[0] || '';
        return prevText.length > currentText.length ? prev : current;
      });

      return longestMatch[0] || content;
    }

    return content;
  } catch (error) {
    logger.error(`Error in regex extraction: ${error}`);
    return html;
  }
}

/**
 * Clean HTML content by removing navigation, ads, and other non-content elements
 */
function cleanHtmlContent(html: string, url: string): string {
  try {
    // Get site-specific configuration
    const sourceConfig = getSourceConfig(url);

    // Apply special cleaning for known problematic sites
    if (sourceConfig.specialCleaning) {
      html = applySpecialCleaning(html, sourceConfig.domain);
    }

    // Apply HTML entity decoding to fix double-encoded entities
    html = decodeHtmlEntities(html);

    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Add special handling for nested span elements which often cause issues
    document.querySelectorAll('span span').forEach(el => {
      // Only simplify excessively nested spans
      if (el.parentElement?.parentElement?.tagName.toLowerCase() === 'span') {
        // Replace nested structure with flattened content
        const content = el.textContent;
        const newSpan = document.createElement('span');
        newSpan.textContent = content;
        if (el.parentElement && el.parentElement.parentNode) {
          el.parentElement.parentNode.replaceChild(newSpan, el.parentElement);
        }
      }
    });

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

    // Fix malformed HTML entities
    const cleanedHtml = document.body.innerHTML
      .replace(/&amp;lt;/g, '&lt;')
      .replace(/&amp;gt;/g, '&gt;')
      .replace(/&amp;amp;/g, '&amp;');

    return cleanedHtml;
  } catch (error) {
    logger.error(`Error cleaning HTML: ${error}`);
    return html; // Return original as fallback
  }
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
 * Parse HTML with retry mechanism
 */
async function parseWithRetry(html: string, url: string): Promise<any> {
  try {
    // Try parsing with standard options first
    const dom = new JSDOM(html, {
      url,
    });

    const reader = new Readability(dom.window.document);

    let article = reader.parse();

    if (!article) {
      // First retry: simplify HTML and try again
      logger.info('First parsing attempt failed, simplifying HTML and retrying');
      const simplifiedHtml = simplifyHtml(html);
      const simplifiedDom = new JSDOM(simplifiedHtml, { url });
      const simplifiedReader = new Readability(simplifiedDom.window.document);
      article = simplifiedReader.parse();

      if (!article) {
        // Second retry: use regex extraction as final fallback
        logger.info('Second parsing attempt failed, using regex extraction as fallback');
        const extractedContent = extractContentWithRegex(html);
        const extractedDom = new JSDOM(`<div>${extractedContent}</div>`, { url });
        const extractedReader = new Readability(extractedDom.window.document);
        article = extractedReader.parse();
      }
    }

    return article;
  } catch (error) {
    logger.error(`All parsing methods failed: ${error}`);
    return null;
  }
}

/**
 * Preserve code blocks and formatting in HTML
 */
function preserveFormattedContent(html: string): string {
  try {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Ensure code blocks are properly preserved
    document.querySelectorAll('pre, code').forEach(el => {
      el.innerHTML = el.innerHTML
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
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
  } catch (error) {
    logger.error(`Error preserving formatted content: ${error}`);
    return html; // Return original HTML as fallback
  }
}

/**
 * Extract metadata from HTML
 */
function extractMetadata(
  html: string,
  url: string
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
 * Extract text content from HTML without tags
 */
function extractTextFromHtml(html: string): string {
  try {
    const dom = new JSDOM(html);
    return dom.window.document.body.textContent?.trim() || '';
  } catch (error) {
    logger.error(`Error extracting text from HTML: ${error}`);
    // Fallback to simple regex if JSDOM fails
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

/**
 * Enhanced parse method with better content extraction and cleaning
 */
export const parse = async (url: string, options: ParserOptions = {}): Promise<CleanedArticle> => {
  logger.info(`Parsing URL: ${url}`);
  const startTime = Date.now();
  let parsingMethod = 'unknown';

  try {
    let articleContent: Partial<CleanedArticle> = {};
    let metadata = {};

    // For safety, ensure URL is valid to prevent security issues
    if (!url.match(/^https?:\/\//i)) {
      throw new Error('Invalid URL format');
    }

    // Check if forceExtractor is set or use default article extractor
    const useExtractor = options.forceExtractor || config.articleExtractor.enabled;

    // Try article-extractor first if enabled
    if (useExtractor) {
      try {
        const timeoutToUse = options.timeout || config.articleExtractor.timeout;

        const article = await extract(
          url,
          {},
          {
            headers: {
              'User-Agent': config.articleExtractor.userAgent,
            },
            timeout: timeoutToUse,
          }
        );

        if (article && article.content) {
          logger.info(`Successfully extracted content from ${url}`);
          parsingMethod = 'article-extractor';

          // Safely process HTML to prevent memory issues
          const processedHtml = safelyProcessHtml(article.content);
          // Clean the extracted content
          const cleanedHtml = cleanHtmlContent(processedHtml, url);
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
            parsingMethod,
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

      try {
        // Apply custom timeout if provided
        const fetchOptions = options.timeout
          ? {
              maxRetries: config.parser.retries || 3,
              retryDelay: 1000,
              timeout: options.timeout,
            }
          : undefined;

        const html = await fetchWithRetry(url, fetchOptions);
        const processedHtml = safelyProcessHtml(html);
        const cleanedHtml = cleanHtmlContent(processedHtml, url);

        // Rest of your code...

        // Extract additional metadata
        metadata = extractMetadata(html, url);

        // Parse with Readability with improved retry logic
        const article = await parseWithRetry(cleanedHtml, url);

        if (!article) {
          logger.warn(`All parsing methods failed for ${url}, returning cleaned HTML as fallback`);
          parsingMethod = 'raw-html-fallback';

          return {
            title: '',
            content: cleanedHtml,
            textContent: extractTextFromHtml(cleanedHtml),
            excerpt: '',
            url: url,
            ...metadata,
            error: 'Parsing failed, returning raw cleaned HTML',
            parsingMethod,
            processingTime: Date.now() - startTime,
          };
        }

        // Preserve formatting in code blocks and lists
        const formattedHtml = preserveFormattedContent(article.content);
        parsingMethod = 'readability';

        articleContent = {
          title: article.title || '',
          content: formattedHtml,
          textContent: article.textContent || '',
          excerpt: article.excerpt || '',
          url: url,
          ...metadata,
          parsingMethod,
        };

        // Extract structured sections
        const sections = extractSections(formattedHtml);
        if (sections.length > 0) {
          articleContent.structure = { sections };
        }
      } catch (error) {
        logger.error(`HTTP fetch and parsing failed for ${url}: ${error}`);
        throw error;
      }
    }

    // Content quality check - if content is suspiciously short, add a warning
    if (articleContent.content && articleContent.content.length < 500) {
      logger.warn(
        `Extracted content for ${url} is suspiciously short (${articleContent.content.length} bytes)`
      );
      articleContent.error = 'Content extraction may be incomplete';
    }

    // Generate summary if requested
    if (options.summarize && articleContent.textContent) {
      logger.info(`Generating summary for ${url}`);
      articleContent.summary = await summarizeContent(articleContent.textContent);
    }

    // Calculate processing time
    const processingTime = Date.now() - startTime;

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
      error: articleContent.error,
      parsingMethod: articleContent.parsingMethod || parsingMethod,
      processingTime,
    };
  } catch (error) {
    logger.error(`Error parsing ${url}: ${error}`);
    const processingTime = Date.now() - startTime;

    // Return a fallback response instead of throwing
    return {
      title: 'Error parsing content',
      content: `<div class="parsing-error">We encountered an issue parsing this content: ${error instanceof Error ? error.message : 'Unknown error'}</div>`,
      textContent: 'Error parsing content',
      excerpt: '',
      url: url,
      error: error instanceof Error ? error.message : 'Unknown error',
      parsingMethod: 'error',
      processingTime,
    };
  }
};

/**
 * Parse HTML content with enhanced cleaning
 */
export const parseHtml = async (
  html: string,
  url: string,
  options: ParserOptions = {}
): Promise<CleanedArticle> => {
  logger.info(`Parsing HTML from ${url}`);
  const startTime = Date.now();
  let parsingMethod = 'unknown';

  try {
    // Safely process HTML
    const processedHtml = safelyProcessHtml(html);
    // Clean HTML before parsing
    const cleanedHtml = cleanHtmlContent(processedHtml, url);
    const formattedHtml = preserveFormattedContent(cleanedHtml);

    // Extract metadata
    const metadata = extractMetadata(html, url);

    // Parse with improved retry mechanism
    const article = await parseWithRetry(formattedHtml, url);

    if (!article) {
      logger.warn(`Failed to parse article from ${url}, returning cleaned HTML as fallback`);
      parsingMethod = 'raw-html-fallback';

      return {
        title: '',
        content: cleanedHtml,
        textContent: extractTextFromHtml(cleanedHtml),
        excerpt: '',
        url: url,
        ...metadata,
        error: 'Parsing failed, returning raw cleaned HTML',
        parsingMethod,
        processingTime: Date.now() - startTime,
      };
    }

    parsingMethod = 'readability';

    const result: CleanedArticle = {
      title: article.title || '',
      content: article.content || '',
      textContent: article.textContent || '',
      excerpt: article.excerpt || '',
      url: url,
      ...metadata,
      parsingMethod,
      processingTime: Date.now() - startTime,
    };

    // Content quality check
    if (result.content && result.content.length < 500) {
      logger.warn(
        `Extracted content from HTML is suspiciously short (${result.content.length} bytes)`
      );
      result.error = 'Content extraction may be incomplete';
    }

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
    const processingTime = Date.now() - startTime;

    // Return a fallback response instead of throwing
    return {
      title: 'Error parsing HTML content',
      content: `<div class="parsing-error">We encountered an issue parsing this HTML content: ${error instanceof Error ? error.message : 'Unknown error'}</div>`,
      textContent: 'Error parsing HTML content',
      excerpt: '',
      url: url,
      error: error instanceof Error ? error.message : 'Unknown error',
      parsingMethod: 'error',
      processingTime,
    };
  }
};
