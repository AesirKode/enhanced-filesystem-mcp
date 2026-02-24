import { Tool } from '@modelcontextprotocol/sdk/types.js';

export function setupJsonTools(): Tool[] {
  return [
    {
      name: 'json_tool',
      description: "Deep JSON operations with JSONPath ($.key, $..key, $.arr[*], filter expressions). Operations: get, set, delete, merge (deep/shallow/replace), diff, flatten, unflatten, validate.",
      inputSchema: {
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            enum: ['get', 'set', 'delete', 'merge', 'transform', 'validate', 'diff', 'flatten', 'unflatten', 'convert'],
            description: 'JSON operation to perform',
          },
          path: {
            type: 'string',
            description: 'Path to JSON file',
          },
          query: {
            type: 'string',
            description: 'JSONPath expression',
          },
          value: {
            description: 'Value to set (any JSON type)',
          },
          mergeWith: {
            type: 'object',
            description: 'Object to merge (inline)',
          },
          mergeWithFile: {
            type: 'string',
            description: 'Path to file to merge with',
          },
          strategy: {
            type: 'string',
            enum: ['deep', 'shallow', 'replace'],
            description: 'Merge strategy (default: deep)',
          },
          output: {
            type: 'string',
            description: 'Output file path (defaults to input)',
          },
          compareTo: {
            type: 'string',
            description: 'Second file path for diff operation',
          },
          transforms: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                query: { type: 'string' },
                value: {},
                multiply: { type: 'number' },
                add: { type: 'number' },
                uppercase: { type: 'boolean' },
                lowercase: { type: 'boolean' },
              },
            },
            description: 'Array of transformations to apply',
          },
        },
        required: ['operation', 'path'],
      },
    },
  ];
}
