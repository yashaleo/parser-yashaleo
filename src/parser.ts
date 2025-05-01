import Parser from '@postlight/parser';
import { APIGatewayProxyEvent, Context, Callback } from 'aws-lambda';

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

    if (!url) {
      return callback(
        null,
        corsErrorResponse({ message: 'Missing URL parameter.' })
      );
    }

    const result = await Parser.parse(url);

    return callback(
      null,
      result
        ? corsSuccessResponse(result)
        : corsErrorResponse({ message: 'Failed to parse the URL.' })
    );
  } catch (err: any) {
    return callback(null, corsErrorResponse({ message: err.message }));
  }
};

export default runWarm(parser);