import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import { APIGatewayProxyEvent, Context, Callback } from 'aws-lambda';
import { summarizeContent } from './services/ai'; // Import the summarization function
import { isValidUrl } from './utils/validators';

import {
  corsSuccessResponse,
  corsErrorResponse,
  runWarm,
} from './utils';

const parseHtml = async (
  { body }: APIGatewayProxyEvent,
  _context: Context,
  callback: Callback
) => {
  try {
    if (!body) {
      return callback(
        null,
        corsErrorResponse({ message: 'Missing request body.' })
      );
    }

    const { url, html } = JSON.parse(body);

    if (!url || !html) {
      return callback(
        null,
        corsErrorResponse({ message: 'URL and HTML must be provided.' })
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

    // Use JSDOM to parse HTML
    const doc = new JSDOM(html, { url });
    const reader = new Readability(doc.window.document);
    const article = reader.parse();

    if (!article) {
        return callback(
          null,
          corsErrorResponse({ message: 'Failed to parse HTML.' })
        );
      }
  
      // Add summary if requested
      if (summarize) {
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
  
  export default runWarm(parseHtml);