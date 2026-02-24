# Enhanced Filesystem MCP Server

[![CI](https://github.com/AesirKode/enhanced-filesystem-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/AesirKode/enhanced-filesystem-mcp/actions/workflows/ci.yml)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen)](https://nodejs.org)
[![Version](https://img.shields.io/badge/version-0.11.0-blue)](#)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

High-performance [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server giving AI agents advanced filesystem and automation capabilities on Windows.

**27 tools** across file I/O, search, Git, process management, Ollama, HTTP, SQLite, SSH, Windows UI automation, and more — all from a single server.

---

## Install

**Requirements:** Node.js >= 22 · Windows (for `windows_tool`; other tools are cross-platform)

```bash
git clone https://github.com/AesirKode/enhanced-filesystem-mcp
cd enhanced-filesystem-mcp
npm install
npm run build
```

### Connect to Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "enhanced-filesystem": {
      "command": "node",
      "args": ["C:/path/to/enhanced-filesystem-mcp/dist/index.js"],
      "env": {
        "ALLOWED_DIRS": "C:/Users/you/Projects",
        "MAX_PARALLEL": "16"
      }
    }
  }
}
```

---

## The Toolkit (27 Tools)

### File Operations
| Tool | Purpose |
| :--- | :--- |
| `efs_read` | Read any file with caching and pagination |
| `efs_write` | Write files of any size — no chunking |
| `efs_edit` | Surgical find/replace |
| `efs_list` | Directory listing with depth and pattern filters |
| `efs_info` | File metadata: size, type, timestamps |
| `efs_delete` | Delete files or directories |
| `efs_move` | Move or rename |
| `efs_search` | Parallel file/content search |
| `efs_batch` | Atomic multi-operation execution with rollback |
| `efs_git` | Git: status, diff, log, blame, commit |

### Execution & Process
| Tool | Purpose |
| :--- | :--- |
| `efs_exec` | Shell command execution |
| `efs_python` | Python with persistent sessions |
| `process_tool` | Service/GPU management + NVIDIA stats |

### AI & Integration
| Tool | Purpose |
| :--- | :--- |
| `ollama_tool` | Ollama LLM: generate, chat, pull, manage models |
| `http_tool` | HTTP client with auth, retry, file download |
| `json_tool` | Deep JSON with JSONPath queries |

### Utilities
| Tool | Purpose |
| :--- | :--- |
| `archive_tool` | Zip: create, extract, list, add |
| `hash_tool` | MD5 / SHA1 / SHA256 / SHA512 |
| `clipboard_tool` | System clipboard read/write |
| `download_tool` | Smart downloads from CivitAI, HuggingFace, URLs |
| `model_tool` | GGUF/Safetensors inspection without loading |
| `yaml_tool` | YAML/TOML config management |
| `diff_tool` | File and directory comparison |
| `windows_tool` | Windows UI automation: keyboard, mouse, screenshots |
| `analysis_tool` | TypeScript/JS code structure analysis |
| `sqlite_tool` | SQLite database operations |
| `ssh_tool` | SSH client with SFTP |

---

## Configuration

All settings via environment variables:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `ALLOWED_DIRS` | *(none)* | Comma-separated allowed directories |
| `CACHE_SIZE` | `100` | LRU cache entries |
| `MAX_PARALLEL` | `16` | Max parallel operations |
| `MODELS_DIR` | `D:\Models` | Base path for `download_tool` auto-placement |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Bug reports and feature requests welcome via [GitHub Issues](../../issues).

## License

MIT — [Aesir / David R.](LICENSE)
