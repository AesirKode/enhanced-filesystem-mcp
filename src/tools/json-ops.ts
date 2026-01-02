import { Tool } from '@modelcontextprotocol/sdk/types.js';

export function setupJsonTools(): Tool[] {
  return [
    {
      name: 'json_tool',
      description: `Deep JSON operations with JSONPath queries.

Operations:
- 'get': Query JSON with JSONPath, returns matching values
- 'set': Set value at JSONPath location
- 'delete': Delete key at JSONPath location
- 'merge': Merge two JSON objects (deep/shallow/replace)
- 'diff': Compare two JSON files, show additions/deletions/changes
- 'flatten': Convert nested object to dot-notation
- 'unflatten': Convert dot-notation back to nested object
- 'validate': Check if file is valid JSON

JSONPath Syntax:
- $.key - Direct property access
- $.key.nested - Nested property
- $..key - Recursive descent (find key anywhere)
- $.array[0] - Array index
- $.array[*] - All array items
- $[?(@.prop == value)] - Filter expression

Parameters:
- operation: Operation to perform (required)
- path: Path to JSON file (required)
- query: JSONPath expression (for get/set/delete)
- value: Value to set (for set operation)
- mergeWith: Object to merge (inline)
- mergeWithFile: Path to file to merge with
- strategy: Merge strategy ('deep'|'shallow'|'replace')
- output: Output file path (defaults to input file)
- compareTo: Second file for diff operation

Examples:

1. Get entire file:
{ operation: 'get', path: 'config.json' }

2. Query with JSONPath:
{ operation: 'get', path: 'workflow.json', query: '$.nodes[*].type' }

3. Get filtered items:
{ operation: 'get', path: 'data.json', query: '$[?(@.active == true)]' }

4. Set value:
{ operation: 'set', path: 'config.json', query: '$.settings.temperature', value: 0.8 }

5. Deep merge configs:
{ 
  operation: 'merge', 
  path: 'base.json', 
  mergeWithFile: 'overrides.json',
  strategy: 'deep',
  output: 'merged.json'
}

6. Inline merge:
{
  operation: 'merge',
  path: 'config.json',
  mergeWith: { newSetting: true }
}

7. Diff two files:
{ operation: 'diff', path: 'old.json', compareTo: 'new.json' }

8. Flatten nested object:
{ operation: 'flatten', path: 'nested.json', output: 'flat.json' }

9. Validate JSON:
{ operation: 'validate', path: 'data.json' }`,
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
