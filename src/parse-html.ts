import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { summarizeContent } from '../services/ai'; // Updated path
import { isValidUrl } from '../utils/validators';
import {
  corsSuccessResponse,
  corsErrorResponse,
} from '../utils/lambda-response'; // Updated import path
import logger from '../utils/logger'; // Added logger

export const handler = async (event: APIGatewayProxyEvent, _context: Context) => {
  try {
    if (!event.body) {
      return corsErrorResponse({ message: 'Missing request body.' });
    }

    const { url, html, format = 'html', summarize = false } = JSON.parse(event.body);

    if (!url || !html) {
      return corsErrorResponse({ message: 'URL and HTML must be provided.' });
    }

    if (!isValidUrl(url)) {
      return corsErrorResponse({ 
        message: 'Invalid URL format. Please provide a valid HTTP or HTTPS URL.' 
      });
    }

    // Use JSDOM to parse HTML
    const doc = new JSDOM(html, { url });
    const reader = new Readability(doc.window.document);
    const article = reader.parse();

    if (!article) {
      return corsErrorResponse({ message: 'Failed to parse HTML.' });
    }

    // Add summary if requested
    if (summarize) {
      try {
        article.summary = await summarizeContent(article.textContent);
      } catch (summaryError) {
        logger.error('Error generating summary:', summaryError);
        article.summary = 'Summary generation failed';
      }
    }

    return corsSuccessResponse(article);
  } catch (err: any) {
    logger.error('Error parsing HTML:', err);
    return corsErrorResponse({ message: err.message });
  }
};

export default handler;