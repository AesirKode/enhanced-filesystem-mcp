import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { CacheManager } from '../core/cache.js';

export function setupGitTools(
  _cache: CacheManager,
  _config: { allowedDirectories: string[] }
): Tool[] {
  return [
    {
      name: 'efs_git',
      description: "Git operations: status, diff, log, blame, add, commit, branch, stash. repoPath required for all operations.",
      inputSchema: {
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            enum: ['status', 'diff', 'log', 'blame', 'add', 'commit', 'branch', 'stash'],
            description: 'Git operation',
          },
          repoPath: { type: 'string', description: 'Repository path' },
          files: {
            type: 'array',
            items: { type: 'string' },
            description: 'Files to operate on',
          },
          message: { type: 'string', description: 'Commit message' },
          branch: { type: 'string', description: 'Branch name' },
          count: { type: 'number', description: 'Log entry count' },
          args: {
            type: 'array',
            items: { type: 'string' },
            description: 'Additional args',
          },
        },
        required: ['operation', 'repoPath'],
      },
    },
  ];
}
