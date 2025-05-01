// src/services/parser.ts

import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';
import { fetchWithRetry } from '../utils/http.js';
import { fetchDynamicContent } from './puppeteer.js';
import { summarizeContent } from './ai.js';
import logger from '../utils/logger.js';

interface ParserOptions {
  format?: 'html' | 'markdown' | 'text';
  summarize?: boolean;
  usePuppeteer?: boolean;
}

export interface ReadabilityArticle {
  title: string;
  content: string;
  textContent: string;
  length: number;
  excerpt: string;
  byline: string;
  dir: string;
  siteName: string;
  lang: string;
  publishedTime: string | null;
  summary?: string;
}

export const parse = async (
  url: string,
  options: ParserOptions = {}
): Promise<ReadabilityArticle> => {
  try {
    let html: string;

    if (options.usePuppeteer) {
      html = await fetchDynamicContent(url);
    } else {
      html = await fetchWithRetry(url, {
        maxRetries: 3,
        retryDelay: 1000,
        timeout: 15000,
      });

      if (
        html.includes('paywall') ||
        html.includes('subscribe') ||
        html.includes('premium content')
      ) {
        html = await fetchDynamicContent(url);
      }
    }

    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const rawArticle = reader.parse();

    if (!rawArticle) {
      throw new Error('Failed to parse content');
    }

    const article: ReadabilityArticle = {
      ...rawArticle,
      summary: undefined,
    };

    if (options.format === 'markdown') {
      const turndownService = new TurndownService();
      article.content = turndownService.turndown(article.content);
    } else if (options.format === 'text') {
      article.content = article.textContent;
    }

    if (options.summarize) {
      article.summary = await summarizeContent(article.textContent);
    }

    return article;
  } catch (error: any) {
    logger.error(`Error parsing URL ${url}:`, error);
    throw new Error(`Failed to parse URL: ${error.message}`);
  }
};

export const parseHtml = async (
  url: string,
  html: string,
  options: ParserOptions = {}
): Promise<ReadabilityArticle> => {
  try {
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const rawArticle = reader.parse();

    if (!rawArticle) {
      throw new Error('Failed to parse content');
    }

    const article: ReadabilityArticle = {
      ...rawArticle,
      summary: undefined,
    };

    if (options.format === 'markdown') {
      const turndownService = new TurndownService();
      article.content = turndownService.turndown(article.content);
    } else if (options.format === 'text') {
      article.content = article.textContent;
    }

    if (options.summarize) {
      article.summary = await summarizeContent(article.textContent);
    }

    return article;
  } catch (error: any) {
    logger.error('Error parsing HTML:', error);
    throw new Error(`Failed to parse HTML: ${error.message}`);
  }
};
