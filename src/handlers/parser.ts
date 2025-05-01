import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { parse } from '../services/parser';
import { corsSuccessResponse, corsErrorResponse } from '../utils/lambda-response';
import { isValidUrl } from '../utils/validators';

export const handler = async (event: APIGatewayProxyEvent, _context: Context) => {
  try {
    const url = event.queryStringParameters?.url;
    const format = event.queryStringParameters?.format || 'html';
    const summarize = event.queryStringParameters?.summarize === 'true';

    if (!url) {
      return corsErrorResponse({ message: 'Missing URL parameter.' });
    }

    if (!isValidUrl(url)) {
      return corsErrorResponse({ 
        message: 'Invalid URL format. Please provide a valid HTTP or HTTPS URL.' 
      });
    }

    const options = {
      format: ['html', 'markdown', 'text'].includes(format) ? format : 'html',
      summarize,
    };

    const result = await parse(url, options);
    
    return corsSuccessResponse(result);
  } catch (err: any) {
    console.error('Error parsing URL:', err);
    return corsErrorResponse({ message: err.message });
  }
};

export default handler;