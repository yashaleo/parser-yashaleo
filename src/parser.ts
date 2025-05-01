import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import { APIGatewayProxyEvent, Context, Callback } from 'aws-lambda';
import { summarizeContent } from './services/ai'; // Import the summarization function
import { fetchWithRetry } from './utils/http';
import { isValidUrl } from './utils/validators';

import {
  corsSuccessResponse,
  corsErrorResponse,
  runWarm,
} from './utils';

const parser = async (
  event: APIGatewayProxyEvent,
  _context: Context,
  callback: Callback
) => {
  try {
    const url = event.queryStringParameters?.url;
    // Check if summarization is requested
    const shouldSummarize = event.queryStringParameters?.summarize === 'true';

    if (!url) {
      return callback(
        null,
        corsErrorResponse({ message: 'Missing URL parameter.' })
      );
    }

    if (!isValidUrl(url)) {
        return callback(
          null,
          corsErrorResponse({ 
            message: 'Invalid URL format. Please provide a valid HTTP or HTTPS URL.' 
          })
        );
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
        return callback(
          null,
          corsErrorResponse({ message: 'Failed to parse the URL.' })
        );
      }
  
      // Add summary if requested
      if (shouldSummarize) {
        try {
          article.summary = await summarizeContent(article.textContent);
        } catch (summaryError) {
          console.error('Error generating summary:', summaryError);
          article.summary = 'Summary generation failed';
        }
      }
  
      return callback(null, corsSuccessResponse(article));
    } catch (err: any) {
      return callback(null, corsErrorResponse({ message: err.message }));
    }
  };
  
  export default runWarm(parser);