/**
 * Download Tool Definition
 * Smart model downloads with auto-placement
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const downloadTool: Tool = {
  name: "download_tool",
  description: `Smart model downloads with progress, resume, and auto-placement.

Supports:
- **CivitAI** - Auto-detects model type, places in correct folder
- **HuggingFace** - Download from any repo
- **Direct URLs** - Any file with resume support

Auto-placement based on model type:
- GGUF → D:\\Models\\llm\\gguf
- Checkpoints → D:\\Models\\image\\base\\{arch}
- LoRA → D:\\Models\\image\\lora\\{arch}
- VAE → D:\\Models\\image\\vae
- ControlNet → D:\\Models\\image\\controlnet
- Embeddings → D:\\Models\\image\\embeddings

Operations:
- 'download': Download a model (auto-detects source)
- 'info': Get model info without downloading
- 'list-paths': Show all model destination paths

Examples:

1. Download from CivitAI (auto-detects type & places correctly):
{ operation: 'download', url: 'https://civitai.com/models/123456/cool-model' }

2. Download specific version:
{ operation: 'download', url: 'https://civitai.com/models/123456?modelVersionId=789' }

3. Download from HuggingFace:
{ operation: 'download', url: 'https://huggingface.co/TheBloke/Model-GGUF/resolve/main/model.Q4_K_M.gguf' }

4. Download to specific folder:
{ operation: 'download', url: 'https://...', destination: 'D:/Models/custom' }

5. Download with hash verification:
{ operation: 'download', url: 'https://...', hash: 'abc123...' }

6. Get model info before downloading:
{ operation: 'info', url: 'https://civitai.com/models/123456' }

7. List all model paths:
{ operation: 'list-paths' }

Features:
- ✅ Resume interrupted downloads
- ✅ Progress tracking
- ✅ SHA256 hash verification
- ✅ Auto-detect model type
- ✅ Smart folder placement
- ✅ CivitAI API integration
- ✅ HuggingFace support`,

  inputSchema: {
    type: "object" as const,
    properties: {
      operation: {
        type: "string",
        enum: ["download", "info", "list-paths"],
        description: "Download operation to perform"
      },
      url: {
        type: "string",
        description: "URL to download from (CivitAI, HuggingFace, or direct)"
      },
      destination: {
        type: "string",
        description: "Override destination folder (optional - auto-detected by default)"
      },
      filename: {
        type: "string",
        description: "Override filename (optional)"
      },
      hash: {
        type: "string",
        description: "Expected SHA256 hash for verification (optional)"
      }
    },
    required: ["operation"]
  }
};
