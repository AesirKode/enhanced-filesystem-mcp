# Enhanced Filesystem MCP Server

**Version:** 0.10.0
**Status:** ✅ Production - Actively Used
**Location:** D:\Projects\enhanced-filesystem-mcp\

High-performance MCP server powering Claude's operations on NYX workstation.

## Quick Reference - 27 Tools

### File Operations (7)
| Tool         | Purpose                           |
| ------------ | --------------------------------- |
| `efs_read`   | Read with caching & pagination    |
| `efs_write`  | Write any size (**NO CHUNKING!**) |
| `efs_edit`   | Surgical find/replace             |
| `efs_list`   | Recursive directory listing       |
| `efs_info`   | File metadata & stats             |
| `efs_delete` | Safe deletion with backup         |
| `efs_move`   | Move/rename files                 |

### Search & Batch (3)
| Tool         | Purpose                         |
| ------------ | ------------------------------- |
| `efs_search` | Fast parallel search (16 cores) |
| `efs_batch`  | Atomic multi-file operations    |
| `efs_git`    | Git: status, diff, log, blame   |

### Execution (3)
| Tool           | Purpose                       |
| -------------- | ----------------------------- |
| `efs_exec`     | Execute shell commands        |
| `efs_python`   | Execute Python code directly  |
| `process_tool` | GPU stats, service management |

### AI & Data Integration (3)
| Tool          | Purpose                                  |
| ------------- | ---------------------------------------- |
| `ollama_tool` | Direct Ollama API (list, generate, chat) |
| `http_tool`   | REST API client with downloads           |
| `json_tool`   | JSONPath queries, merge, diff            |

### Workflow & Utility (11)
| Tool             | Purpose                                |
| ---------------- | -------------------------------------- |
| `comfyui_tool`   | ComfyUI workflow control               |
| `archive_tool`   | Zip operations (list, create, extract) |
| `hash_tool`      | File checksums (MD5, SHA256)           |
| `clipboard_tool` | System clipboard (copy, read)          |
| `download_tool`  | Smart model downloads                  |
| `model_tool`     | Safetensors/GGUF inspection            |
| `yaml_tool`      | YAML/TOML config operations            |
| `diff_tool`      | Compare files/directories              |
| `windows_tool`   | Windows UI automation & control        |
| `analysis_tool`  | Code structure analysis (TS/JS)        |
| `sqlite_tool`    | SQLite database operations             |
| `ssh_tool`       | SSH client (exec, sftp, shell)         |
| `efs_python`     | Python execution (now with sessions!)  |

## Model Tool - Inspect Without Loading 🔍

Inspect AI model metadata without loading them into memory:

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

## YAML Tool - Config File Operations ⭐ NEW

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

## Diff Tool - Compare Files/Directories ⭐ NEW

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

## Download Tool - Smart Downloads 🌟

Smart downloads from CivitAI, HuggingFace, or direct URLs with:
- **Auto-placement** - Models go to the right folder automatically
- **Resume support** - Interrupted downloads continue where they left off
- **Hash verification** - Verify downloads match expected SHA256
- **Progress tracking** - See download speed and ETA
- **CivitAI integration** - Fetches model info from their API

### Auto-Placement Paths
| Model Type         | Destination                 |
| ------------------ | --------------------------- |
| GGUF (LLM)         | D:\Models\llm\gguf          |
| Checkpoint (SD1.5) | D:\Models\image\base\sd15   |
| Checkpoint (SDXL)  | D:\Models\image\base\sdxl   |
| Checkpoint (Pony)  | D:\Models\image\base\pony   |
| Checkpoint (Flux)  | D:\Models\image\flux        |
| LoRA               | D:\Models\image\lora\{arch} |
| VAE                | D:\Models\image\vae         |
| ControlNet         | D:\Models\image\controlnet  |
| Embeddings         | D:\Models\image\embeddings  |
| Upscalers          | D:\Models\image\upscale     |

### Download Examples

```javascript
// CivitAI - auto-detects type and places correctly!
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

## Clipboard Tool Examples

```javascript
// Copy text - reduces manual work with hand disability!
clipboard_tool({ operation: 'copy', text: 'npm install express' })

// Read clipboard
clipboard_tool({ operation: 'read' })

// Copy file paths for Explorer
clipboard_tool({ operation: 'copy-files', files: ['D:/file.txt'] })
```

## ComfyUI Tool Examples

```javascript
// Check status
comfyui_tool({ operation: 'status' })

// Queue workflow
comfyui_tool({ operation: 'queue', workflowPath: 'D:/workflow.json' })

// Queue and wait for result
comfyui_tool({ operation: 'wait', workflowPath: 'D:/workflow.json' })

// Download output image
comfyui_tool({ operation: 'download', filename: 'ComfyUI_00001.png', outputPath: 'D:/out.png' })
```

## Architecture

```
[Claude Desktop / JanAI]
       ↓
[Enhanced Filesystem MCP v0.8.0]
   ├── CacheManager (LRU, 100MB)
   ├── ParallelExecutor (16 cores)
   ├── TransactionManager (atomic ops)
   ├── FileReader / FileWriter (streaming)
   ├── Searcher (parallel)
   ├── GitManager
   ├── OllamaClient
   ├── HttpClient
   ├── JsonDeep (JSONPath)
   ├── ProcessManager (GPU/services)
   ├── ComfyUIClient (workflows)
   ├── ArchiveManager (zip)
   ├── HashManager (checksums)
   ├── ClipboardManager (system clipboard)
   ├── DownloadManager (smart downloads)
   ├── ModelInspector (safetensors/GGUF)
   └── YamlManager (YAML/TOML/JSON) ⭐ NEW
       ↓
[Filesystem / Git / Ollama / ComfyUI / CivitAI / HuggingFace]
```

## Build & Install

```bash
cd D:\Projects\enhanced-filesystem-mcp
npm install
npm run build
```

## Configuration

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

## Statistics

- **TypeScript files:** 32
- **Compiled JS:** 35
- **Total lines:** ~8,500+
- **Tools:** 24

---
**Author:** Built for NYX PC (i7-13700K, 32GB DDR5, RTX 4070 Ti)
**License:** MIT
