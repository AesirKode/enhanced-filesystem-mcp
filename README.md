# Enhanced Filesystem MCP Server

> **A high-performance [Model Context Protocol](https://modelcontextprotocol.io/) server providing 28 tools for filesystem operations, process execution, AI integration, and system automation.**

Designed and optimized for the **NYX Workstation** — Intel Core i7-13700K (16C/24T), 32 GB DDR5-6400, NVIDIA RTX 4070 Ti (12 GB), triple NVMe — running Windows 11 Pro.

[![Version](https://img.shields.io/badge/version-0.10.1-blue)](#version-history)
[![Tools](https://img.shields.io/badge/tools-28-green)](#quick-reference---28-tools)
[![License](https://img.shields.io/badge/license-MIT-yellow)](#license)
[![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](#build--install)

---

## Features

- **28 production tools** spanning file I/O, search, git, execution, AI, and system automation
- **Zero-chunking writes** — stream files of any size in a single call
- **16-core parallel search** — leverages all available CPU threads
- **Atomic batch operations** — all-or-nothing multi-file transactions with rollback
- **LRU caching** — 100 MB in-memory cache with 50–250× faster repeated reads
- **AI-native** — direct Ollama, ComfyUI, CivitAI, and HuggingFace integration
- **Smart model downloads** — auto-detect model type and place in the correct directory
- **Windows UI automation** — keyboard, mouse, window management, screenshots
- **Remote access** — SSH/SFTP client for remote server management

---

## Quick Reference — 28 Tools

### File Operations (7)

| Tool | Purpose |
| --- | --- |
| `efs_read` | Read with caching & pagination |
| `efs_write` | Write any size (**NO CHUNKING!**) |
| `efs_edit` | Surgical find/replace |
| `efs_list` | Recursive directory listing |
| `efs_info` | File metadata & stats |
| `efs_delete` | Safe deletion with backup |
| `efs_move` | Move/rename files |

### Search & Batch (3)

| Tool | Purpose |
| --- | --- |
| `efs_search` | Fast parallel search (16 cores) |
| `efs_batch` | Atomic multi-file operations |
| `efs_git` | Git: status, diff, log, blame, commit |

### Execution (3)

| Tool | Purpose |
| --- | --- |
| `efs_exec` | Execute shell commands |
| `efs_python` | Python execution with persistent sessions |
| `process_tool` | GPU stats, service management |

### AI & Data Integration (3)

| Tool | Purpose |
| --- | --- |
| `ollama_tool` | Direct Ollama API (list, generate, chat) |
| `http_tool` | REST API client with downloads |
| `json_tool` | JSONPath queries, merge, diff |

### Workflow & Utility (12)

| Tool | Purpose |
| --- | --- |
| `comfyui_tool` | ComfyUI workflow control & AI agent |
| `archive_tool` | Zip operations (list, create, extract) |
| `hash_tool` | File checksums (MD5, SHA256, SHA512) |
| `clipboard_tool` | System clipboard (copy, read, files) |
| `download_tool` | Smart model downloads (CivitAI, HuggingFace) |
| `model_tool` | Safetensors/GGUF inspection |
| `yaml_tool` | YAML/TOML config operations |
| `diff_tool` | Compare files & directories |
| `windows_tool` | Windows UI automation & control |
| `analysis_tool` | Code structure analysis (TS/JS) |
| `sqlite_tool` | SQLite database operations |
| `ssh_tool` | SSH/SFTP remote operations |

---

## Tool Highlights

### Model Tool — Inspect Without Loading 🔍

Read AI model metadata directly from file headers — no GPU memory required:

```javascript
// Get info about a GGUF model
model_tool({ operation: 'info', path: 'D:/Models/llm/gguf/mistral-7b.Q4_K_M.gguf' })
// → Architecture: llama, Quantization: Q4_K_M, Context: 32768, Parameters: ~7B

// Get safetensors info with tensor list
model_tool({ operation: 'info', path: 'D:/Models/image/base/model.safetensors', tensors: true })

// List all models in a directory
model_tool({ operation: 'list', path: 'D:/Models/llm/gguf' })

// Compare two models
model_tool({ operation: 'compare', path1: 'model-q4.gguf', path2: 'model-q8.gguf' })

// Search for models
model_tool({ operation: 'search', path: 'D:/Models', query: 'llama' })
```

### YAML Tool — Config File Operations ⭐ NEW

Read, write, convert, and merge YAML/TOML/JSON config files:

```javascript
// Read entire YAML file
yaml_tool({ operation: 'get', path: 'config.yaml' })

// Get specific key (dot notation)
yaml_tool({ operation: 'get', path: 'config.yaml', query: 'database.host' })

// Set value
yaml_tool({ operation: 'set', path: 'config.yaml', query: 'server.port', value: 8080 })

// Convert YAML to JSON
yaml_tool({ operation: 'convert', path: 'config.yaml', outputFormat: 'json', output: 'config.json' })

// Merge configs
yaml_tool({ operation: 'merge', path: 'base.yaml', mergeWithFile: 'override.yaml' })

// Diff two configs
yaml_tool({ operation: 'diff', path: 'old.yaml', compareTo: 'new.yaml' })

// Validate
yaml_tool({ operation: 'validate', path: 'config.toml' })
```

### Diff Tool — Compare Files & Directories ⭐ NEW

Compare files and directories to find differences:

```javascript
// Compare two text files
diff_tool({ operation: 'files', path1: 'D:/old-config.yaml', path2: 'D:/new-config.yaml' })

// Compare with more context lines
diff_tool({ operation: 'files', path1: 'D:/v1.js', path2: 'D:/v2.js', context: 5 })

// Get unified diff format (for patches)
diff_tool({ operation: 'files', path1: 'D:/old.txt', path2: 'D:/new.txt', unified: true })

// Compare two directories
diff_tool({ operation: 'dirs', path1: 'D:/ProjectV1', path2: 'D:/ProjectV2' })

// Quick check if files are identical
diff_tool({ operation: 'quick', path1: 'D:/backup.zip', path2: 'D:/archive.zip' })

// Compare file stats (size, modified time)
diff_tool({ operation: 'stat', path1: 'D:/file1.bin', path2: 'D:/file2.bin' })
```

### Download Tool — Smart Model Downloads 🌟

Smart downloads from CivitAI, HuggingFace, or direct URLs with auto-placement, resume support, hash verification, progress tracking, and CivitAI API integration.

#### Auto-Placement Paths

| Model Type | Destination |
| --- | --- |
| GGUF (LLM) | `D:\Models\llm\gguf` |
| Checkpoint (SD1.5) | `D:\Models\image\base\sd15` |
| Checkpoint (SDXL) | `D:\Models\image\base\sdxl` |
| Checkpoint (Pony) | `D:\Models\image\base\pony` |
| Checkpoint (Flux) | `D:\Models\image\flux` |
| LoRA | `D:\Models\image\lora\{arch}` |
| VAE | `D:\Models\image\vae` |
| ControlNet | `D:\Models\image\controlnet` |
| Embeddings | `D:\Models\image\embeddings` |
| Upscalers | `D:\Models\image\upscale` |

#### Download Examples

```javascript
// CivitAI — auto-detects type and places correctly!
download_tool({ operation: 'download', url: 'https://civitai.com/models/123456/cool-model' })

// HuggingFace GGUF
download_tool({ operation: 'download', url: 'https://huggingface.co/TheBloke/Model-GGUF/resolve/main/model.Q4_K_M.gguf' })

// Get model info before downloading
download_tool({ operation: 'info', url: 'https://civitai.com/models/123456' })

// Custom destination
download_tool({ operation: 'download', url: '...', destination: 'D:/Models/custom' })

// With hash verification
download_tool({ operation: 'download', url: '...', hash: 'abc123...' })

// List all model paths
download_tool({ operation: 'list-paths' })
```

### Clipboard Tool

```javascript
// Copy text to clipboard
clipboard_tool({ operation: 'copy', text: 'npm install express' })

// Read clipboard contents
clipboard_tool({ operation: 'read' })

// Copy file paths for Explorer paste
clipboard_tool({ operation: 'copy-files', files: ['D:/file.txt'] })
```

### ComfyUI Tool

```javascript
// Check system status (GPU, VRAM, queue)
comfyui_tool({ operation: 'status' })

// Queue a workflow
comfyui_tool({ operation: 'queue', workflowPath: 'D:/workflow.json' })

// Queue and wait for result
comfyui_tool({ operation: 'wait', workflowPath: 'D:/workflow.json' })

// Download output image
comfyui_tool({ operation: 'download', filename: 'ComfyUI_00001.png', outputPath: 'D:/out.png' })

// AI agent — natural language image generation
comfyui_tool({ operation: 'agent', agentRequest: 'a sunset over mountains', agentWait: true })
```

---

## Architecture

```
[Claude Desktop / JanAI / Claude.ai]
       ↓ (MCP Protocol — stdio)
[Enhanced Filesystem MCP v0.10.1]
   ├── CacheManager (LRU, 100MB)
   ├── ParallelExecutor (16 cores)
   ├── TransactionManager (atomic ops)
   ├── FileReader / FileWriter (streaming)
   ├── Searcher (parallel file/content search)
   ├── GitManager (status, diff, log, blame, commit)
   ├── PythonSession (persistent sessions)
   ├── ProcessManager (GPU stats, service lifecycle)
   ├── OllamaClient (models, generate, chat, embeddings)
   ├── HttpClient (REST, downloads, auth, retry)
   ├── JsonDeep (JSONPath queries, merge, diff)
   ├── ComfyUIClient (workflows, models, queue)
   ├── ComfyUIAgent (LLM-driven image generation)
   ├── ArchiveManager (zip create/extract/add)
   ├── HashManager (MD5, SHA1, SHA256, SHA512)
   ├── ClipboardManager (text, files, system clipboard)
   ├── DownloadManager (CivitAI, HuggingFace, direct)
   ├── ModelInspector (safetensors/GGUF header reading)
   ├── YamlManager (YAML/TOML/JSON config ops)
   ├── DiffManager (file & directory compare)
   ├── WindowsAutomation (keyboard, mouse, windows, screenshots)
   ├── CodeAnalysis (TS/JS structure extraction)
   ├── SQLiteManager (queries, schema, inspect)
   └── SSHClient (exec, SFTP upload/download)
       ↓
[Filesystem / Git / Ollama / ComfyUI / CivitAI / HuggingFace / SQLite / SSH]
```

---

## Build & Install

```bash
cd D:\Projects\enhanced-filesystem-mcp
npm install
npm run build
```

### Configuration

Add to your MCP client config:

**Claude Desktop:** `%APPDATA%\Claude\claude_desktop_config.json`
**JanAI:** `%APPDATA%\Jan\data\mcp_config.json`

```json
{
  "mcpServers": {
    "enhanced-filesystem": {
      "command": "node",
      "args": ["D:\\Projects\\enhanced-filesystem-mcp\\dist\\index.js"],
      "active": true
    }
  }
}
```

---

## Statistics

| Metric | Value |
| --- | --- |
| Tools | 28 |
| TypeScript source files | 45 |
| Total lines of code | ~11,500 |
| Core modules | 28 |
| Tool handler modules | 16 |

---

## Version History

| Version | Date | Tools Added | Notes |
| --- | --- | --- | --- |
| 0.1.0 | 2024-12 | 7 | Core file operations |
| 0.2.0 | 2024-12 | 2 | Search & batch |
| 0.3.0 | 2024-12 | 3 | Git & execution |
| 0.4.0 | 2025-01 | 4 | AI integration (Ollama, HTTP, JSON, Process) |
| 0.5.0 | 2026-01 | 3 | ComfyUI, archive, hash |
| 0.5.1 | 2026-01 | 1 | Clipboard (accessibility) |
| 0.6.0 | 2026-01 | 1 | Smart model downloads (CivitAI/HuggingFace) |
| 0.7.0 | 2026-01 | 1 | Model inspector (safetensors/GGUF) |
| 0.8.0 | 2026-01 | 1 | YAML/TOML config operations |
| 0.9.0 | 2026-01 | 1 | Diff (file/directory compare) |
| 0.10.0 | 2026-01 | 4 | Windows automation, code analysis, SQLite, SSH |

---

## Target Hardware

| Component | Spec |
| --- | --- |
| CPU | Intel Core i7-13700K (16 cores / 24 threads) |
| RAM | 32 GB Corsair Dominator Platinum DDR5-6400 |
| GPU | NVIDIA GeForce RTX 4070 Ti (12 GB GDDR6X) |
| Storage | Samsung 990 Pro NVMe ×2 + WD SN850x NVMe |
| OS | Windows 11 Pro |

---

## License

Licensed under the [MIT License](LICENSE).

Copyright (c) 2026 Aesir / David R.
