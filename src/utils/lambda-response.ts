interface JsonBody {
  [key: string]: any;
}

interface LambdaResponseOptions {
  json: JsonBody;
  statusCode: number;
  allowCORS?: boolean;
}

interface LambdaResponse {
  statusCode: number;
  body: string;
  headers?: Record<string, string>;
}

function lambdaResponse({
  json,
  statusCode,
  allowCORS = false,
}: LambdaResponseOptions): LambdaResponse {
  const response: LambdaResponse = {
    statusCode,
    body: JSON.stringify(json),
  };

  if (allowCORS) {
    response.headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
    };
  }

  return response;
}

// === Exported helpers ===

export function errorResponse(json: JsonBody) {
  return lambdaResponse({ json, statusCode: 500 });
}

export function corsErrorResponse(json: JsonBody) {
  return lambdaResponse({ json, statusCode: 500, allowCORS: true });
}

export function successResponse(json: JsonBody) {
  return lambdaResponse({ json, statusCode: 200 });
}

export function corsSuccessResponse(json: JsonBody) {
  return lambdaResponse({ json, statusCode: 200, allowCORS: true });
}