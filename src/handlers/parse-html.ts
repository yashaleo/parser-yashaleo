import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { parseHtml } from '../services/parser';
import { corsSuccessResponse, corsErrorResponse } from '../utils/lambda-response';
import { isValidUrl } from '../utils/validators';
import logger from '../utils/logger'; // Import logger

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
        message: 'Invalid URL format. Please provide a valid HTTP or HTTPS URL.',
      });
    }

    const options = {
      format: ['html', 'markdown', 'text'].includes(format) ? format : 'html',
      summarize,
    };

    const result = await parseHtml(url, html, options);

    return corsSuccessResponse(result);
  } catch (err: any) {
    logger.error('Error parsing HTML:', err);
    return corsErrorResponse({ message: err.message });
  }
};

export default handler;
