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
      description: `Read file with automatic caching and streaming support.
      
Features:
- Automatic caching for repeated reads (50-250x faster)
- No size limits - handles files of any size
- Pagination support (offset/length)
- Binary and text file support
- Excel: Read specific sheets and ranges
- PDF: Extract text as markdown

Parameters:
- path: File path to read
- offset: Start position (line number for text, byte offset for binary)
- length: Number of lines/bytes to read (default: all)
- encoding: Text encoding (default: utf8)
- sheet: Excel sheet name or index
- range: Excel cell range (e.g., "A1:C100")`,
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
      description: `Write file with streaming support - NO CHUNKING REQUIRED.
      
Features:
- Stream large files without memory issues
- No 25-30 line limit - write files of any size
- Automatic cache invalidation
- Mode: 'rewrite' (replace) or 'append' (add to end)
- Excel: Write 2D arrays
- Automatic backup creation

Parameters:
- path: File path to write
- content: Content to write (string or JSON for Excel)
- mode: 'rewrite' or 'append' (default: rewrite)
- encoding: Text encoding (default: utf8)`,
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path' },
          content: { type: 'string', description: 'Content to write' },
          mode: { 
            type: 'string', 
            enum: ['rewrite', 'append'],
            description: 'Write mode (default: rewrite)' 
          },
          encoding: { type: 'string', description: 'Text encoding (optional)' },
        },
        required: ['path', 'content'],
      },
    },
    {
      name: 'efs_edit',
      description: `Surgical file editing with find/replace.
      
Features:
- Find and replace specific text
- Excel: Update specific cell ranges
- Multiple replacements in one call
- Automatic backups
- Cache invalidation

Parameters:
- path: File path to edit
- oldText: Text to find
- newText: Replacement text
- count: Number of replacements (default: 1, -1 for all)
- range: Excel range for cell updates (optional)`,
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path' },
          oldText: { type: 'string', description: 'Text to find' },
          newText: { type: 'string', description: 'Replacement text' },
          count: { type: 'number', description: 'Replacement count (-1 = all)' },
          range: { type: 'string', description: 'Excel range (optional)' },
        },
        required: ['path', 'oldText', 'newText'],
      },
    },
    {
      name: 'efs_list',
      description: `List directory contents with recursive support.
      
Features:
- Recursive listing with depth control
- File sizes and metadata
- Filtering by pattern
- Sort by name, size, or date

Parameters:
- path: Directory path
- depth: Recursion depth (default: 2)
- pattern: File pattern filter (optional)
- sortBy: 'name' | 'size' | 'date' (default: name)`,
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Directory path' },
          depth: { type: 'number', description: 'Recursion depth (default: 2)' },
          pattern: { type: 'string', description: 'File pattern (optional)' },
          sortBy: { 
            type: 'string', 
            enum: ['name', 'size', 'date'],
            description: 'Sort order' 
          },
        },
        required: ['path'],
      },
    },
    {
      name: 'efs_info',
      description: `Get detailed file metadata.
      
Returns:
- Size, creation time, modification time
- Line count for text files
- Sheet info for Excel files
- Image dimensions for images
- File type and encoding

Parameters:
- path: File path`,
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
      description: `Delete file or directory with backup.
      
Features:
- Automatic backup before deletion
- Recursive directory deletion
- Confirmation option

Parameters:
- path: File/directory path
- recursive: Allow directory deletion (default: false)`,
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
      description: `Move or rename file/directory.
      
Features:
- Move across directories
- Rename in place
- Automatic backup

Parameters:
- source: Source path
- destination: Destination path`,
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
