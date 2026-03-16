/**
 * http-request — Make an outbound HTTP/HTTPS request.
 *
 * Requires config.allowHttp = true.
 *
 * Uses the built-in `fetch` API (Node 18+). Response body is always returned
 * as a string; callers parse JSON themselves if needed.
 */

/** @type {import('../executor.js').ToolManifest} */
export const manifest = Object.freeze({
  id: 'http-request',
  version: '1.0.0',
  description: 'Make an HTTP/HTTPS request and return the response status, headers, and body.',
  inputSchema: {
    type: 'object',
    properties: {
      url:     { type: 'string', description: 'Request URL (must start with http:// or https://).' },
      method:  { type: 'string', description: 'HTTP method (default: GET).' },
      headers: { type: 'object', description: 'Optional request headers.', additionalProperties: { type: 'string' } },
      body:    { type: 'string', description: 'Optional request body (string).' },
    },
    required: ['url'],
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      status:  { type: 'number', description: 'HTTP response status code.' },
      headers: { type: 'object', description: 'Response headers as a plain object.', additionalProperties: { type: 'string' } },
      body:    { type: 'string', description: 'Response body as a string.' },
    },
    required: ['status', 'headers', 'body'],
    additionalProperties: false,
  },
});

/** Requires allowHttp config flag. */
export const requiredPermissions = ['allowHttp'];

/**
 * Perform the HTTP request.
 *
 * @param {{ url: string, method?: string, headers?: object, body?: string }} input
 * @param {object} _context  - Unused by this tool.
 * @returns {Promise<{ status: number, headers: object, body: string }>}
 */
export async function run(input, _context) {
  const { url, method = 'GET', headers = {}, body } = input;

  const response = await fetch(url, {
    method,
    headers,
    body: body ?? undefined,
  });

  const responseBody = await response.text();

  // Collect headers into a plain object
  const responseHeaders = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  return {
    status:  response.status,
    headers: responseHeaders,
    body:    responseBody,
  };
}
