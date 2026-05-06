import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { CacheManager } from '../core/cache.js';
import { ParallelExecutor } from '../core/executor.js';

export function setupFileTools(
  _cache: CacheManager,
  _executor: ParallelExecutor,
  _config: { allowedDirectories: string[] }
): Tool[] {
  return [
    {
      name: 'efs_read',
      description: "Read file with caching and pagination. Supports any size, text/binary, offset/length. Excel: specify sheet/range. PDF: extracts as markdown.",
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path' },
          offset: { type: 'number', description: 'Start offset (optional)' },
          length: { type: 'number', description: 'Amount to read (optional)' },
          encoding: { type: 'string', description: 'Text encoding (optional)' },
          sheet: { type: 'string', description: 'Excel sheet name/index (optional)' },
          range: { type: 'string', description: 'Excel range like "A1:C100" (optional)' },
        },
        required: ['path'],
      },
    },
    {
      name: 'efs_write',
      description: "Write file of any size — no chunking required. Mode: 'rewrite' (default) or 'append'. Invalidates cache automatically.",
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path' },
          content: { type: 'string', description: 'Content to write' },
          mode: { type: 'string', enum: ['rewrite', 'append'], description: 'Write mode (default: rewrite)' },
          encoding: { type: 'string', description: 'Text encoding (optional)' },
        },
        required: ['path', 'content'],
      },
    },
    {
      name: 'efs_edit',
      description: "Surgical find/replace in a file. oldText must be unique. count: default 1, use -1 for all occurrences. Set dryRun=true to preview the change without writing. Creates automatic backup.",
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path' },
          oldText: { type: 'string', description: 'Text to find' },
          newText: { type: 'string', description: 'Replacement text' },
          count: { type: 'number', description: 'Replacement count (-1 = all)' },
          dryRun: { type: 'boolean', description: 'Preview only — do not write to disk. Returns excerpts of the change.' },
          range: { type: 'string', description: 'Excel range (optional)' },
        },
        required: ['path', 'oldText', 'newText'],
      },
    },
    {
      name: 'efs_list',
      description: "List directory contents. Supports depth control, glob pattern filter, and sort by name/size/date.",
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Directory path' },
          depth: { type: 'number', description: 'Recursion depth (default: 2)' },
          pattern: { type: 'string', description: 'File pattern (optional)' },
          sortBy: { type: 'string', enum: ['name', 'size', 'date'], description: 'Sort order' },
        },
        required: ['path'],
      },
    },
    {
      name: 'efs_info',
      description: "Get file/directory metadata: size, type, line count, created/modified timestamps.",
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path' },
        },
        required: ['path'],
      },
    },
    {
      name: 'efs_delete',
      description: "Delete file or directory. Set recursive: true for directories. Creates automatic backup before deletion.",
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Path to delete' },
          recursive: { type: 'boolean', description: 'Delete directories' },
        },
        required: ['path'],
      },
    },
    {
      name: 'efs_move',
      description: "Move or rename a file or directory. Works across directories. Creates automatic backup.",
      inputSchema: {
        type: 'object',
        properties: {
          source: { type: 'string', description: 'Source path' },
          destination: { type: 'string', description: 'Destination path' },
        },
        required: ['source', 'destination'],
      },
    },
  ];
}
