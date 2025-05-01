import puppeteer from 'puppeteer';

export const fetchDynamicContent = async (url: string) => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  try {
    const page = await browser.newPage();
    
    // Set user agent to avoid blocking
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Set extra HTTP headers to bypass simple paywalls
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    });
    
    // Add timeout
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for content to load
    await page.waitForSelector('article, .article, .post, .content, main', { 
      timeout: 5000 
    }).catch(() => {
      console.log('No specific content selector found, using body');
    });
    
    // Scroll to load lazy content
    await autoScroll(page);
    
    // Try to dismiss modals/popups
    await dismissPopups(page);
    
    // Extract the HTML content
    const html = await page.content();
    return html;
  } finally {
    await browser.close();
  }
};

async function autoScroll(page: puppeteer.Page) {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
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

async function dismissPopups(page: puppeteer.Page) {
  try {
    // Common selectors for popups, modals, and paywalls
    const selectors = [
      '.modal-close', '.close-button', '.dismiss', '.paywall-close',
      'button:contains("Close")', 'button:contains("No Thanks")',
      'button:contains("I\'ll Pass")', 'button:contains("Not Now")',
      '[aria-label="Close"]', '[data-testid="popup-close"]'
    ];
    
    for (const selector of selectors) {
      await page.evaluate((sel) => {
        const elements = document.querySelectorAll(sel);
        elements.forEach(el => {
          if (el instanceof HTMLElement) {
            el.click();
          }
        });
      }, selector);
    }
  } catch (error) {
    console.log('Error dismissing popups:', error);
  }
}