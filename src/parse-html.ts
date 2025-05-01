import Parser from '@postlight/parser';
import { APIGatewayProxyEvent, Context, Callback } from 'aws-lambda';

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

    const result = await Parser.parse(url, { html });

    return callback(
      null,
      result
        ? corsSuccessResponse(result)
        : corsErrorResponse({ message: 'Failed to parse HTML.' })
    );
  } catch (err: any) {
    return callback(null, corsErrorResponse({ message: err.message }));
  }
};

export default runWarm(parseHtml);