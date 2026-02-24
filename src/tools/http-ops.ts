import { Tool } from '@modelcontextprotocol/sdk/types.js';

export function setupHttpTools(): Tool[] {
  return [
    {
      name: 'http_tool',
      description: "HTTP client: GET/POST/PUT/DELETE/PATCH/HEAD. Supports JSON body, Bearer/Basic auth, custom headers, timeout, retry with backoff, file download via 'download' path param.",
      inputSchema: {
        type: 'object',
        properties: {
          method: {
            type: 'string',
            enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'],
            description: 'HTTP method',
          },
          url: {
            type: 'string',
            description: 'Request URL',
          },
          headers: {
            type: 'object',
            additionalProperties: { type: 'string' },
            description: 'Custom request headers',
          },
          body: {
            description: 'Request body (will be JSON-serialized if object)',
          },
          auth: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['bearer', 'basic'] },
              token: { type: 'string', description: 'Bearer token' },
              username: { type: 'string', description: 'Basic auth username' },
              password: { type: 'string', description: 'Basic auth password' },
            },
            description: 'Authentication configuration',
          },
          timeout: {
            type: 'number',
            description: 'Request timeout in milliseconds (default: 30000)',
          },
          retry: {
            type: 'object',
            properties: {
              count: { type: 'number', description: 'Number of retry attempts' },
              delay: { type: 'number', description: 'Initial delay between retries in ms' },
              backoff: { type: 'number', description: 'Backoff multiplier (default: 1)' },
            },
            description: 'Retry configuration',
          },
          download: {
            type: 'string',
            description: 'File path to save response (for downloads)',
          },
        },
        required: ['method', 'url'],
      },
    },
  ];
}
