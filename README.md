# Enhanced Filesystem MCP Server

**Version:** 0.10.1
**Status:**  Production - Actively Used
**Total Tools:** 28
**License:** MIT

High-performance Model Context Protocol (MCP) server providing AI agents with advanced filesystem and automation tools. 
---

## The Toolkit (28 Tools)

### File & Search
| Tool | Purpose |
| :--- | :--- |
| `efs_read` | High-speed read with caching and pagination. |
| `efs_write` | Direct write for any file size (No chunking required). |
| `efs_edit` | Surgical find/replace for code refactoring. |
| `efs_search` | Parallelized file search leveraging 16 CPU cores. |
| `efs_git` | Integrated Git operations: status, diff, log, and blame. |

### Advanced Automation
- **Execution:** `efs_exec` (Shell), `efs_python` (Native Python sessions), and `process_tool` (Service/GPU management).
- **AI Integration:** Native `ollama_tool` for LLM control and `http_tool` for API interactions.
- **Utilities:** `model_tool` (GGUF/Safetensors inspection), `yaml_tool` (Config management), and `diff_tool` (File/Dir comparison).
- **Windows UI:** `windows_tool` for direct OS automation and control.

---

## Build & Install
Set-Location -Path "C:\path\to\enhanced-filesystem-mcp"
npm install
npm run build
