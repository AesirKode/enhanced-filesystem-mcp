import { Tool } from '@modelcontextprotocol/sdk/types.js';

export function setupOllamaTools(): Tool[] {
  return [
    {
      name: 'ollama_tool',
      description: "Ollama LLM integration. Operations: list (installed models), show (model details), pull (download), delete, copy, create (from Modelfile), generate (single prompt), chat (multi-turn), embeddings, ps (loaded in memory). Config: optional host/timeout overrides.",
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
