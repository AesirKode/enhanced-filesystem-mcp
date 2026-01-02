import { Tool } from '@modelcontextprotocol/sdk/types.js';

export function setupSearchTools(): Tool[] {
  return [
    {
      name: 'efs_search',
      description: `Fast parallel search with indexing.
      
Features:
- Parallel search across all CPU cores (16x faster on your i7-13700K)
- Smart indexing for frequently searched directories
- Streaming results (see matches as they're found)
- File name and content search
- Regex and literal matching
- Fuzzy search option

Search Types:
- 'files': Search by filename/pattern
- 'content': Search text inside files
- 'smart': Auto-detect best search type

Parameters:
- path: Directory to search
- pattern: Search pattern (regex or literal)
- searchType: 'files' | 'content' | 'smart' (default: smart)
- filePattern: Filter by file type (e.g., "*.js")
- maxResults: Limit results (default: 100)
- contextLines: Lines of context for content search (default: 2)
- caseSensitive: Case sensitive search (default: false)

Examples:
  efs_search({ path: "D:/Projects", pattern: "*.py", searchType: "files" })
  efs_search({ path: "D:/Projects", pattern: "function_name", searchType: "content" })
  efs_search({ path: "D:/Projects", pattern: "bug", filePattern: "*.js", maxResults: 50 })`,
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Directory to search' },
          pattern: { type: 'string', description: 'Search pattern' },
          searchType: {
            type: 'string',
            enum: ['files', 'content', 'smart'],
            description: 'Search type (default: smart)',
          },
          filePattern: { type: 'string', description: 'File type filter (optional)' },
          maxResults: { type: 'number', description: 'Result limit (default: 100)' },
          contextLines: { type: 'number', description: 'Context lines (default: 2)' },
          caseSensitive: { type: 'boolean', description: 'Case sensitive (default: false)' },
        },
        required: ['path', 'pattern'],
      },
    },
  ];
}
