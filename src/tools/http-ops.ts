import { Tool } from '@modelcontextprotocol/sdk/types.js';

export function setupHttpTools(): Tool[] {
  return [
    {
      name: 'http_tool',
      description: `HTTP client for REST API requests.

Features:
- All HTTP methods (GET, POST, PUT, DELETE, PATCH, HEAD)
- JSON and text responses
- File downloads with progress
- Authentication (Bearer, Basic)
- Timeout and retry with backoff
- Custom headers

Common Use Cases:
- Test local APIs (Ollama, ComfyUI, KoboldCpp)
- Webhook integrations
- Download files
- Health checks

Parameters:
- method: HTTP method (required)
- url: Request URL (required)
- headers: Custom headers object
- body: Request body (auto-serialized to JSON)
- auth: { type: 'bearer'|'basic', token?, username?, password? }
- timeout: Request timeout in ms (default: 30000)
- retry: { count, delay, backoff } for retries
- download: File path to save response

Examples:

1. Simple GET:
{ method: 'GET', url: 'http://localhost:11434/api/tags' }

2. POST with JSON body:
{
  method: 'POST',
  url: 'http://localhost:11434/api/generate',
  body: { model: 'llama3', prompt: 'Hello', stream: false }
}

3. ComfyUI queue workflow:
{
  method: 'POST',
  url: 'http://localhost:8188/prompt',
  body: { prompt: workflowJson }
}

4. Download file:
{
  method: 'GET',
  url: 'https://example.com/model.safetensors',
  download: 'D:/Models/sd/checkpoints/model.safetensors',
  timeout: 600000
}

5. With authentication:
{
  method: 'GET',
  url: 'https://api.example.com/data',
  auth: { type: 'bearer', token: 'your-api-key' }
}

6. With retry:
{
  method: 'GET',
  url: 'http://slow-server.local/data',
  timeout: 60000,
  retry: { count: 3, delay: 1000, backoff: 2 }
}`,
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
