# CLAUDE.md - Enhanced Filesystem MCP Server

## Project Overview
High-performance MCP (Model Context Protocol) server providing 28 tools for filesystem operations, process execution, AI integration, and utilities.

**Version:** 0.10.0
**Node:** >=20.0.0
**Type:** ES Modules

## Quick Commands
```bash
npm run build      # Compile TypeScript
npm run dev        # Run with tsx (development)
npm start          # Run compiled version
npm test           # Run vitest tests
npm run lint       # ESLint
npm run format     # Prettier
```

## Architecture

```
src/
├── index.ts           # Main server, tool registration, request handlers
├── core/              # Core functionality modules
│   ├── cache.ts       # LRU cache manager
│   ├── executor.ts    # Parallel execution engine
│   ├── transaction.ts # Transaction manager for batch ops
│   ├── reader.ts      # File reading with caching
│   ├── writer.ts      # File writing operations
│   ├── editor.ts      # Text replacement/editing
│   ├── lister.ts      # Directory listing
│   ├── searcher.ts    # File/content search
│   ├── git.ts         # Git operations (simple-git)
│   ├── batch.ts       # Batch operation executor
│   ├── ollama.ts      # Ollama LLM integration
│   ├── http-client.ts # HTTP request handling
│   ├── json-deep.ts   # Deep JSON operations
│   ├── process-manager.ts # Process/GPU management
│   ├── comfyui.ts     # ComfyUI API client
│   ├── archive.ts     # Zip/unzip operations
│   ├── hash.ts        # File hashing (MD5, SHA256, etc.)
│   ├── clipboard.ts   # System clipboard access
│   ├── download.ts    # URL download manager
│   ├── model.ts       # ML model file operations
│   ├── yaml.ts        # YAML parsing/writing
│   ├── diff.ts        # File diff operations
│   ├── windows.ts     # Windows automation
│   ├── analysis.ts    # Code analysis
│   ├── sqlite.ts      # SQLite operations
│   └── ssh.ts         # SSH client
├── tools/             # Tool definitions and handlers
│   ├── file-ops.ts    # efs_read, efs_write, efs_edit, efs_list, efs_info, efs_delete, efs_move
│   ├── search-ops.ts  # efs_search
│   ├── batch-ops.ts   # efs_batch
│   ├── git-ops.ts     # efs_git
│   ├── process-ops.ts # efs_exec, efs_python, process_tool
│   ├── ollama-ops.ts  # ollama_tool
│   ├── http-ops.ts    # http_tool
│   ├── json-ops.ts    # json_tool
│   ├── comfyui-ops.ts # comfyui_tool
│   ├── download-ops.ts # download_tool
│   ├── windows-ops.ts # windows_tool
│   ├── analysis-ops.ts # analysis_tool
│   ├── sqlite-ops.ts  # sqlite_tool
│   ├── ssh-ops.ts     # ssh_tool
│   └── utility-ops.ts # archive_tool, hash_tool, clipboard_tool, model_tool, yaml_tool, diff_tool
└── process/
    └── simple-exec.ts # Shell/Python command execution
```

## Tool Categories

| Category    | Tools                                                                                                                                                      | Description                                       |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| **File**    | efs_read, efs_write, efs_edit, efs_list, efs_info, efs_delete, efs_move                                                                                    | Core filesystem operations with caching           |
| **Search**  | efs_search, efs_batch, efs_git                                                                                                                             | Search, batch operations, git integration         |
| **Exec**    | efs_exec, efs_python, process_tool                                                                                                                         | Command execution, Python, GPU/process management |
| **AI**      | ollama_tool, http_tool, json_tool                                                                                                                          | Ollama LLM, HTTP requests, deep JSON operations   |
| **Utility** | comfyui_tool, archive_tool, hash_tool, clipboard_tool, download_tool, model_tool, yaml_tool, diff_tool, windows_tool, analysis_tool, sqlite_tool, ssh_tool | Various utilities                                 |

## Key Dependencies
- `@modelcontextprotocol/sdk` - MCP server framework
- `simple-git` - Git operations
- `fast-glob` - Fast file globbing
- `lru-cache` - Caching layer
- `p-queue` - Parallel execution control
- `sharp` - Image processing
- `archiver/unzipper` - Archive operations
- `chokidar` - File watching
- `yaml` - YAML parsing

## Configuration (Environment Variables)
```bash
ALLOWED_DIRS=D:\Projects,D:\Models  # Comma-separated allowed directories
CACHE_SIZE=100                       # LRU cache size
MAX_PARALLEL=16                      # Max parallel operations
```

## Development Notes
- All handlers in `src/index.ts` follow the pattern: `handleX(args)` returning `{ content: [{ type: 'text', text: string }], isError?: boolean }`
- Tools are registered in `registerTools()` function
- Core modules export single functions for their operations
- Error handling wraps all operations with descriptive messages

## After Changes
Always run `npm run build` after modifying TypeScript files.
