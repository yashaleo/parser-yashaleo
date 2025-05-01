import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { parse } from '../services/parser';
import { corsSuccessResponse, corsErrorResponse } from '../utils/lambda-response';
import { isValidUrl } from '../utils/validators';
import logger from '../utils/logger';

const allowedFormats = ['html', 'markdown', 'text'] as const;
type FormatType = typeof allowedFormats[number];

export const handler = async (event: APIGatewayProxyEvent, _context: Context) => {
  try {
    const url = event.queryStringParameters?.url;
    const formatRaw = event.queryStringParameters?.format;
    const summarize = event.queryStringParameters?.summarize === 'true';

    if (!url) {
      return corsErrorResponse({ message: 'Missing URL parameter.' });
    }

    if (!isValidUrl(url)) {
      return corsErrorResponse({
        message: 'Invalid URL format. Please provide a valid HTTP or HTTPS URL.',
      });
    }

    const format: FormatType = allowedFormats.includes(formatRaw as FormatType)
      ? (formatRaw as FormatType)
      : 'html';

    const options = { format, summarize };

    const result = await parse(url, options);

    return corsSuccessResponse(result);
  } catch (err: any) {
    logger.error('Error parsing URL:', err);
    return corsErrorResponse({ message: err.message });
  }
};

export default handler;