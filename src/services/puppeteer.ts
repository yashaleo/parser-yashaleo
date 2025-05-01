// src/services/puppeteer.ts

import puppeteer from 'puppeteer';
import logger from '../utils/logger';
import type { Page } from 'puppeteer';
/**
 * Fetches and renders HTML content from a URL using Puppeteer for JavaScript execution
 */
export const fetchDynamicContent = async (url: string): Promise<string> => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    );

    await page.setExtraHTTPHeaders({
      Accept: 'text/html,application/xhtml+xml,application/xml',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    });

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    await page
      .waitForSelector('article, .article, .post, .content, main', {
        timeout: 5000,
      })
      .catch(() => {
        logger.info('No specific content selector found, using body');
      });

    await autoScroll(page);
    await dismissPopups(page);

    return await page.content();
  } catch (error) {
    logger.error(`Error fetching dynamic content from ${url}:`, error);
    throw new Error(
      `Failed to fetch dynamic content: ${error instanceof Error ? error.message : String(error)}`
    );
  } finally {
    await browser.close();
  }
};

/**
 * Scrolls the page to load lazy content
 */
async function autoScroll(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>(resolve => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const { scrollHeight } = document.body;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

/**
 * Attempts to dismiss common popup/modal dialogs
 */
async function dismissPopups(page: Page): Promise<void> {
  try {
    const selectors = [
      '.modal-close',
      '.close-button',
      '.dismiss',
      '.paywall-close',
      'button:contains("Close")',
      'button:contains("No Thanks")',
      'button:contains("I\'ll Pass")',
      'button:contains("Not Now")',
      '[aria-label="Close"]',
      '[data-testid="popup-close"]',
    ];

    for (const selector of selectors) {
      await page.evaluate((sel: string) => {
        const elements = document.querySelectorAll(sel);
        elements.forEach(el => {
          if (el instanceof HTMLElement) el.click();
        });
      }, selector);
    }
  } catch (error) {
    logger.warn('Error dismissing popups:', error);
  }
}