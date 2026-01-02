import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { TransactionManager } from '../core/transaction.js';

export function setupBatchTools(
  _transactionManager: TransactionManager,
  _config: { allowedDirectories: string[] }
): Tool[] {
  return [
    {
      name: 'efs_batch',
      description: `Execute multiple file operations atomically.
      
Features:
- All operations succeed or all rollback
- Automatic backups before modifications
- Parallel execution when possible
- Transaction support

All operations complete in a single call with automatic error handling.

Operations supported:
- read: Read file
- write: Create/modify file
- edit: Find/replace in file
- delete: Remove file
- move: Move/rename file
- list: List directory

Parameters:
- operations: Array of operations to execute
- atomic: Use transactions (all-or-nothing) (default: true)
- parallel: Execute in parallel when safe (default: true)

Operation format:
{
  op: 'read' | 'write' | 'edit' | 'delete' | 'move' | 'list',
  path: string,
  // op-specific fields...
}

Examples:

1. Read multiple files:
{
  operations: [
    { op: 'read', path: 'file1.txt' },
    { op: 'read', path: 'file2.txt' },
    { op: 'read', path: 'file3.txt' }
  ],
  parallel: true
}

2. Atomic refactoring:
{
  operations: [
    { op: 'edit', path: 'file1.js', oldText: 'oldName', newText: 'newName' },
    { op: 'edit', path: 'file2.js', oldText: 'oldName', newText: 'newName' },
    { op: 'move', source: 'old.js', destination: 'new.js' }
  ],
  atomic: true
}

3. Project setup:
{
  operations: [
    { op: 'write', path: 'src/index.ts', content: '...' },
    { op: 'write', path: 'package.json', content: '...' },
    { op: 'write', path: 'tsconfig.json', content: '...' }
  ]
}`,
      inputSchema: {
        type: 'object',
        properties: {
          operations: {
            type: 'array',
            description: 'Array of operations',
            items: {
              type: 'object',
              properties: {
                op: {
                  type: 'string',
                  enum: ['read', 'write', 'edit', 'delete', 'move', 'list'],
                },
                path: { type: 'string' },
                content: { type: 'string' },
                oldText: { type: 'string' },
                newText: { type: 'string' },
                source: { type: 'string' },
                destination: { type: 'string' },
              },
              required: ['op', 'path'],
            },
          },
          atomic: {
            type: 'boolean',
            description: 'Use transactions (default: true)',
          },
          parallel: {
            type: 'boolean',
            description: 'Execute in parallel (default: true)',
          },
        },
        required: ['operations'],
      },
    },
  ];
}
