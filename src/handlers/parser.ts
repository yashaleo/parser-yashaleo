import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { parse } from '../services/parser.js';
import { corsSuccessResponse, corsErrorResponse } from '../utils/lambda-response.js';
import { isValidUrl } from '../utils/validators.js';
import logger from '../utils/logger.js';

const allowedFormats = ['html', 'markdown', 'text'] as const;
type FormatType = (typeof allowedFormats)[number];

export const handler = async (event: APIGatewayProxyEvent, _context: Context) => {
  try {
    const url = event.queryStringParameters?.url;
    const formatRaw = event.queryStringParameters?.format;
    const summarize = event.queryStringParameters?.summarize === 'true';
    const forceExtractor = event.queryStringParameters?.forceExtractor === 'true'; // New parameter to force using article-extractor
    const timeout = parseInt(event.queryStringParameters?.timeout || '15000', 10); // New parameter for custom timeout

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

    // Enhanced options object with additional parameters
    const options = {
      format,
      summarize,
      forceExtractor,
      timeout: isNaN(timeout) ? 15000 : Math.min(Math.max(timeout, 5000), 60000), // Bound timeout between 5s and 60s
    };

    const result = await parse(url, options);

    // Add diagnostics when there are parsing issues
    if (result.error || (result.content && result.content.length < 500)) {
      logger.warn(`Parsed content for ${url} has issues`, {
        contentLength: result.content?.length || 0,
        title: result.title,
        error: result.error,
      });
    }

    return corsSuccessResponse({
      ...result,
      _diagnostics: {
        parsingMethod: result.parsingMethod || 'unknown',
        processingTime: result.processingTime || 0,
        contentLength: result.content?.length || 0,
        ...(result.error || (result.content && result.content.length < 500)
          ? {
              qualityWarning:
                'The content may not have been parsed optimally. Try with different options.',
            }
          : {}),
      },
    });
  } catch (err: any) {
    // Add more detailed error logging
    logger.error('Error parsing URL:', {
      url: event.queryStringParameters?.url,
      error: err.message,
      stack: err.stack,
      params: event.queryStringParameters,
    });

    return corsErrorResponse({
      message: err.message,
      url: event.queryStringParameters?.url,
      suggestion: 'Try with format=text or use the parse-html endpoint with custom HTML',
    });
  }
};

export default handler;
