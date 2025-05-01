import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { summarizeContent } from '../services/ai'; // Updated path with proper relative path
import { fetchWithRetry } from '../utils/http';
import { isValidUrl } from '../utils/validators';
import {corsSuccessResponse,corsErrorResponse,} from '../utils/lambda-response'; // Updated import path and removed runWarm
import logger from '../utils/logger'; // Added logger for better error handling

// Updated to modern async/await pattern without callbacks
export const handler = async (event: APIGatewayProxyEvent, _context: Context) => {
  try {
    const url = event.queryStringParameters?.url;
    // Check if summarization is requested
    const shouldSummarize = event.queryStringParameters?.summarize === 'true';
    const format = event.queryStringParameters?.format || 'html';

    if (!url) {
      return corsErrorResponse({ message: 'Missing URL parameter.' });
    }

    if (!isValidUrl(url)) {
      return corsErrorResponse({
        message: 'Invalid URL format. Please provide a valid HTTP or HTTPS URL.'
      });
    }

    // Fetch the content from the URL
    const html = await fetchWithRetry(url, {
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 15000
    });

    // Use JSDOM to parse HTML
    const doc = new JSDOM(html, { url });
    const reader = new Readability(doc.window.document);
    const article = reader.parse();

    if (!article) {
      return corsErrorResponse({ message: 'Failed to parse the URL.' });
    }

    // Add summary if requested
    if (shouldSummarize) {
      try {
        article.summary = await summarizeContent(article.textContent);
      } catch (summaryError) {
        logger.error('Error generating summary:', summaryError);
        article.summary = 'Summary generation failed';
      }
    }

    return corsSuccessResponse(article);
  } catch (err: any) {
    logger.error('Error parsing URL:', err);
    return corsErrorResponse({ message: err.message });
  }
};

export default handler;