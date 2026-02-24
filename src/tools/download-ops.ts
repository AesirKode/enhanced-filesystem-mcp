/**
 * Download Tool Definition
 * Smart model downloads with auto-placement
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const downloadTool: Tool = {
  name: "download_tool",
  description: "Smart model downloads with resume, progress, SHA256 verification, and auto-placement. Sources: CivitAI (auto-detects type), HuggingFace, direct URLs. Operations: download, info (preview without downloading), list-paths (show all model folders).",

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
