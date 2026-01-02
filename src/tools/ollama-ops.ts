import { Tool } from '@modelcontextprotocol/sdk/types.js';

export function setupOllamaTools(): Tool[] {
  return [
    {
      name: 'ollama_tool',
      description: `Direct Ollama API integration for model management and inference.

Operations:
- 'list': List all installed models
- 'show': Show model details (modelfile, parameters, template)
- 'pull': Download a model from Ollama registry
- 'delete': Remove a model
- 'copy': Copy/clone a model with new name
- 'create': Create model from Modelfile
- 'generate': Generate completion (single prompt)
- 'chat': Multi-turn chat conversation
- 'embeddings': Generate text embeddings
- 'ps': List models currently loaded in memory

Parameters:
- operation: Operation to perform (required)
- model: Model name (required for most operations)
- prompt: Text prompt (for generate/embeddings)
- messages: Chat messages array (for chat)
- options: Generation options (temperature, top_p, etc.)
- source/destination: For copy operation
- modelfile/modelfileContent: For create operation
- config: Optional { host, timeout } overrides

Examples:

1. List models:
{ operation: 'list' }

2. Show model info:
{ operation: 'show', model: 'llama3:8b' }

3. Pull a model:
{ operation: 'pull', model: 'mistral:7b' }

4. Generate completion:
{ 
  operation: 'generate', 
  model: 'llama3:8b', 
  prompt: 'Explain quantum computing',
  options: { temperature: 0.7 }
}

5. Chat conversation:
{
  operation: 'chat',
  model: 'llama3:8b',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello!' }
  ]
}

6. Create custom model:
{
  operation: 'create',
  model: 'my-assistant',
  modelfileContent: 'FROM llama3:8b\\nSYSTEM You are a coding expert.'
}

7. Check loaded models:
{ operation: 'ps' }`,
      inputSchema: {
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            enum: ['list', 'show', 'pull', 'delete', 'copy', 'create', 'generate', 'chat', 'embeddings', 'ps'],
            description: 'Ollama operation to perform',
          },
          model: {
            type: 'string',
            description: 'Model name (e.g., llama3:8b, mistral:7b)',
          },
          prompt: {
            type: 'string',
            description: 'Text prompt for generate/embeddings',
          },
          messages: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                role: { type: 'string', enum: ['system', 'user', 'assistant'] },
                content: { type: 'string' },
              },
              required: ['role', 'content'],
            },
            description: 'Chat messages array',
          },
          options: {
            type: 'object',
            properties: {
              temperature: { type: 'number', description: 'Sampling temperature (0-2)' },
              top_p: { type: 'number', description: 'Top-p sampling (0-1)' },
              top_k: { type: 'number', description: 'Top-k sampling' },
              num_predict: { type: 'number', description: 'Max tokens to generate' },
              stop: { type: 'array', items: { type: 'string' }, description: 'Stop sequences' },
              seed: { type: 'number', description: 'Random seed for reproducibility' },
              num_ctx: { type: 'number', description: 'Context window size' },
            },
            description: 'Generation options',
          },
          source: {
            type: 'string',
            description: 'Source model name (for copy)',
          },
          destination: {
            type: 'string',
            description: 'Destination model name (for copy)',
          },
          modelfile: {
            type: 'string',
            description: 'Path to Modelfile (for create)',
          },
          modelfileContent: {
            type: 'string',
            description: 'Inline Modelfile content (for create)',
          },
          config: {
            type: 'object',
            properties: {
              host: { type: 'string', description: 'Ollama host URL (default: http://localhost:11434)' },
              timeout: { type: 'number', description: 'Request timeout in ms (default: 300000)' },
            },
            description: 'Optional configuration overrides',
          },
        },
        required: ['operation'],
      },
    },
  ];
}
