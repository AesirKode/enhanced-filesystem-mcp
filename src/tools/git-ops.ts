import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { CacheManager } from '../core/cache.js';

export function setupGitTools(
  _cache: CacheManager,
  _config: { allowedDirectories: string[] }
): Tool[] {
  return [
    {
      name: 'efs_git',
      description: `Git operations for version control.
      
Features:
- Status: Show working tree status
- Diff: Show changes
- Log: Show commit history
- Blame: Show line-by-line authorship
- Add: Stage files
- Commit: Create commits
- Branch: List/create/switch branches
- Stash: Stash changes

Operations:
- 'status': Get repository status
- 'diff': Show file differences
- 'log': Show commit history
- 'blame': Show line authorship
- 'add': Stage files
- 'commit': Create commit
- 'branch': Branch operations
- 'stash': Stash operations

Parameters:
- operation: Git operation to perform
- repoPath: Repository path
- files: Files to operate on (optional)
- message: Commit message (for commit)
- branch: Branch name (for branch ops)
- count: Number of log entries (default: 10)
- args: Additional git arguments (optional)

Examples:

1. Check status:
{ operation: 'status', repoPath: 'D:/Projects/myproject' }

2. View diff:
{ operation: 'diff', repoPath: 'D:/Projects/myproject', files: ['src/index.ts'] }

3. Show log:
{ operation: 'log', repoPath: 'D:/Projects/myproject', count: 20 }

4. Blame file:
{ operation: 'blame', repoPath: 'D:/Projects/myproject', files: ['src/main.ts'] }

5. Stage and commit:
First: { operation: 'add', repoPath: '...', files: ['file1.ts', 'file2.ts'] }
Then: { operation: 'commit', repoPath: '...', message: 'Fix bug' }`,
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
