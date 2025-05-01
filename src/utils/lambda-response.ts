interface JsonBody {
    [key: string]: any;
  }
  
  interface LambdaResponseOptions {
    json: JsonBody;
    statusCode: number;
    allowCORS?: boolean;
    headers?: Record<string, string>;
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
    headers = {},
  }: LambdaResponseOptions): LambdaResponse {
    const response: LambdaResponse = {
      statusCode,
      body: JSON.stringify(json),
      headers: { ...headers }
    };
  
    if (allowCORS) {
      response.headers = {
        ...response.headers,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,GET,POST',
        'Access-Control-Allow-Credentials': 'true',
      };
    }
  
    return response;
  }
  
  // === Exported helpers ===
  
  export function errorResponse(json: JsonBody, headers?: Record<string, string>) {
    return lambdaResponse({ json, statusCode: 500, headers });
  }
  
  export function corsErrorResponse(json: JsonBody, headers?: Record<string, string>) {
    return lambdaResponse({ json, statusCode: 500, allowCORS: true, headers });
  }
  
  export function successResponse(json: JsonBody, headers?: Record<string, string>) {
    return lambdaResponse({ json, statusCode: 200, headers });
  }
  
  export function corsSuccessResponse(json: JsonBody, headers?: Record<string, string>) {
    return lambdaResponse({ json, statusCode: 200, allowCORS: true, headers });
  }
  
  export function notFoundResponse(json: JsonBody, headers?: Record<string, string>) {
    return lambdaResponse({ json, statusCode: 404, headers });
  }
  
  export function corsNotFoundResponse(json: JsonBody, headers?: Record<string, string>) {
    return lambdaResponse({ json, statusCode: 404, allowCORS: true, headers });
  }
  
  export function badRequestResponse(json: JsonBody, headers?: Record<string, string>) {
    return lambdaResponse({ json, statusCode: 400, headers });
  }
  
  export function corsBadRequestResponse(json: JsonBody, headers?: Record<string, string>) {
    return lambdaResponse({ json, statusCode: 400, allowCORS: true, headers });
  }