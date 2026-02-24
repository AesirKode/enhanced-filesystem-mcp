# Enhanced Filesystem MCP Server

**Version:** 0.11.0  
**Status:** Production - Actively Used  
**Total Tools:** 27  
**License:** MIT  

High-performance Model Context Protocol (MCP) server providing AI agents with advanced filesystem and automation tools.

---

## The Toolkit (27 Tools)

### File & Search
| Tool | Purpose |
| :--- | :--- |
| `efs_read` | High-speed read with caching and pagination. |
| `efs_write` | Direct write for any file size (no chunking required). |
| `efs_edit` | Surgical find/replace for code refactoring. |
| `efs_list` | Directory listing with depth and pattern filters. |
| `efs_info` | File metadata: size, type, timestamps. |
| `efs_delete` | Delete files or directories (recursive supported). |
| `efs_move` | Move or rename files. |
| `efs_search` | Parallelized file/content search across 16 CPU cores. |
| `efs_batch` | Atomic multi-operation execution with rollback. |
| `efs_git` | Git operations: status, diff, log, blame, commit. |

### Execution & Process
| Tool | Purpose |
| :--- | :--- |
| `efs_exec` | Shell command execution with output capture. |
| `efs_python` | Native Python sessions with persistent state. |
| `process_tool` | Service/GPU management (Ollama, ComfyUI, etc.). |

### AI & Integration
| Tool | Purpose |
| :--- | :--- |
| `ollama_tool` | Full Ollama LLM control: generate, chat, pull, manage. |
| `http_tool` | HTTP client with auth, retry, and file download. |
| `json_tool` | Deep JSON operations with JSONPath queries. |

### Utilities
| Tool | Purpose |
| :--- | :--- |
| `archive_tool` | Zip archive: create, extract, list, add. |
| `hash_tool` | File hashing: MD5, SHA1, SHA256, SHA512. |
| `clipboard_tool` | System clipboard read/write. |
| `download_tool` | Smart downloads from CivitAI, HuggingFace, or direct URLs. |
| `model_tool` | GGUF/Safetensors inspection without loading into memory. |
| `yaml_tool` | YAML/TOML config management with dot-notation queries. |
| `diff_tool` | File and directory comparison. |
| `windows_tool` | Windows UI automation: keyboard, mouse, screenshots. |
| `analysis_tool` | TypeScript/JavaScript code structure analysis. |
| `sqlite_tool` | SQLite database operations and schema inspection. |
| `ssh_tool` | SSH client with SFTP upload/download support. |

---

## Build & Install

```powershell
Set-Location -Path "D:\Projects\enhanced-filesystem-mcp"
npm install
npm run build
```

## Configuration

```bash
ALLOWED_DIRS=D:\Projects,D:\Models  # Comma-separated allowed directories
CACHE_SIZE=100                       # LRU cache size (default: 100)
MAX_PARALLEL=16                      # Max parallel operations (default: 16)
```

---

*Built for NYX — Intel i7-13700K / RTX 4070 Ti / 32GB DDR5*  
*MIT License — Aesir / David R.*
