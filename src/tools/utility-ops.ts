/**
 * Utility Tool Definitions
 * archive_tool, hash_tool, clipboard_tool, model_tool, yaml_tool, diff_tool
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const archiveTool: Tool = {
  name: "archive_tool",
  description: "Zip archive operations: list contents, create from files/dirs, extract to directory, add files to existing archive.",
  inputSchema: {
    type: "object" as const,
    properties: {
      operation: { type: "string", enum: ["list", "create", "extract", "add"], description: "Archive operation to perform" },
      path: { type: "string", description: "Path to archive file (for list/extract/add)" },
      output: { type: "string", description: "Output path (archive path for create, directory for extract)" },
      sources: { type: "array", items: { type: "string" }, description: "Source files/directories to archive (for create)" },
      files: { type: "array", items: { type: "string" }, description: "Files to add (for add operation)" },
      overwrite: { type: "boolean", description: "Overwrite existing files when extracting (default: true)" }
    },
    required: ["operation"]
  }
};

export const yamlTool: Tool = {
  name: "yaml_tool",
  description: "YAML/TOML/JSON config file operations. Supports get (dot-notation query), set, delete, validate, convert between formats, merge, diff, keys, format. Auto-detects format from extension.",
  inputSchema: {
    type: "object" as const,
    properties: {
      operation: { type: "string", enum: ["get", "set", "delete", "validate", "convert", "merge", "diff", "keys", "format"], description: "YAML/TOML operation to perform" },
      path: { type: "string", description: "Path to config file" },
      query: { type: "string", description: "Key path using dot notation (e.g., 'database.host')" },
      value: { description: "Value to set (any type)" },
      format: { type: "string", enum: ["yaml", "toml", "json"], description: "Force input format (auto-detected by default)" },
      outputFormat: { type: "string", enum: ["yaml", "toml", "json"], description: "Output format for convert operation" },
      output: { type: "string", description: "Output file path (defaults to input file)" },
      mergeWith: { type: "object", description: "Object to merge (inline)" },
      mergeWithFile: { type: "string", description: "Path to file to merge with" },
      compareTo: { type: "string", description: "Second file path for diff operation" },
      strategy: { type: "string", enum: ["deep", "shallow", "replace"], description: "Merge strategy (default: deep)" },
      indent: { type: "number", description: "Indentation level (default: 2)" },
      limit: { type: "number", description: "Limit number of keys shown (default: 50)" }
    },
    required: ["operation"]
  }
};

export const hashTool: Tool = {
  name: "hash_tool",
  description: "File hashing and verification. Operations: hash (single file), verify (against expected), compare (two files), multiple (batch), string (hash text). Algorithms: md5, sha1, sha256, sha512.",
  inputSchema: {
    type: "object" as const,
    properties: {
      operation: { type: "string", enum: ["hash", "verify", "compare", "multiple", "string"], description: "Hash operation to perform" },
      path: { type: "string", description: "File path (for hash/verify)" },
      paths: { type: "array", items: { type: "string" }, description: "File paths (for multiple)" },
      file1: { type: "string", description: "First file (for compare)" },
      file2: { type: "string", description: "Second file (for compare)" },
      expected: { type: "string", description: "Expected hash value (for verify)" },
      data: { type: "string", description: "String data to hash (for string)" },
      algorithm: { type: "string", enum: ["md5", "sha1", "sha256", "sha512"], description: "Hash algorithm (default: sha256)" }
    },
    required: ["operation"]
  }
};

export const modelTool: Tool = {
  name: "model_tool",
  description: "Inspect AI model files (Safetensors/GGUF) without loading into memory. Operations: info (metadata, tensors, quantization), list (scan directory), compare (two models), search (by name/arch).",
  inputSchema: {
    type: "object" as const,
    properties: {
      operation: { type: "string", enum: ["info", "list", "compare", "search"], description: "Model operation to perform" },
      path: { type: "string", description: "Path to model file or directory" },
      path1: { type: "string", description: "First model path (for compare)" },
      path2: { type: "string", description: "Second model path (for compare)" },
      query: { type: "string", description: "Search query (for search)" },
      recursive: { type: "boolean", description: "Recurse into subdirectories (default: true)" },
      tensors: { type: "boolean", description: "Include tensor list in output" },
      metadata: { type: "boolean", description: "Include full metadata in output" },
      limit: { type: "number", description: "Limit number of tensors/metadata shown (default: 20)" }
    },
    required: ["operation"]
  }
};

export const clipboardTool: Tool = {
  name: "clipboard_tool",
  description: "System clipboard operations: copy text, read/paste current content, check type, clear, copy file paths for Explorer, get file paths from clipboard.",
  inputSchema: {
    type: "object" as const,
    properties: {
      operation: { type: "string", enum: ["copy", "read", "paste", "type", "clear", "copy-files", "get-files"], description: "Clipboard operation to perform" },
      text: { type: "string", description: "Text to copy (for copy operation)" },
      files: { type: "array", items: { type: "string" }, description: "File paths to copy (for copy-files operation)" }
    },
    required: ["operation"]
  }
};

export const diffTool: Tool = {
  name: "diff_tool",
  description: "Compare files and directories. Operations: files (line-by-line diff), dirs (structural comparison), stat (size/date metadata), quick (fast identical check). Supports unified diff format.",
  inputSchema: {
    type: "object" as const,
    properties: {
      operation: { type: "string", enum: ["files", "dirs", "stat", "quick"], description: "Diff operation to perform" },
      path1: { type: "string", description: "First file or directory path" },
      path2: { type: "string", description: "Second file or directory path" },
      context: { type: "number", description: "Context lines around changes (default: 3)" },
      unified: { type: "boolean", description: "Output in unified diff format" },
      limit: { type: "number", description: "Limit number of changes shown (default: 100)" }
    },
    required: ["operation", "path1", "path2"]
  }
};
