/**
 * Archive Tool Definition
 * Operations: list, create, extract, add
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const archiveTool: Tool = {
  name: "archive_tool",
  description: `Zip archive operations - list, create, extract, add files.

Operations:
- 'list': List contents of a zip archive
- 'create': Create a new zip archive from files/directories
- 'extract': Extract archive to a directory
- 'add': Add files to existing archive

Examples:

1. List archive contents:
{ operation: 'list', path: 'D:/backups/project.zip' }

2. Create archive from files:
{ operation: 'create', output: 'D:/backup.zip', sources: ['D:/Projects/myapp', 'D:/docs/readme.md'] }

3. Extract archive:
{ operation: 'extract', path: 'D:/backup.zip', output: 'D:/restored' }

4. Add files to archive:
{ operation: 'add', path: 'D:/backup.zip', files: ['D:/new-file.txt', 'D:/another.md'] }`,

  inputSchema: {
    type: "object" as const,
    properties: {
      operation: {
        type: "string",
        enum: ["list", "create", "extract", "add"],
        description: "Archive operation to perform"
      },
      path: {
        type: "string",
        description: "Path to archive file (for list/extract/add)"
      },
      output: {
        type: "string",
        description: "Output path (archive path for create, directory for extract)"
      },
      sources: {
        type: "array",
        items: { type: "string" },
        description: "Source files/directories to archive (for create)"
      },
      files: {
        type: "array",
        items: { type: "string" },
        description: "Files to add (for add operation)"
      },
      overwrite: {
        type: "boolean",
        description: "Overwrite existing files when extracting (default: true)"
      }
    },
    required: ["operation"]
  }
};

export const yamlTool: Tool = {
  name: "yaml_tool",
  description: `YAML and TOML config file operations.

Operations:
- 'get': Read file or query specific key (dot notation)
- 'set': Set value at key path
- 'delete': Delete key
- 'validate': Check if file is valid
- 'convert': Convert between YAML/TOML/JSON formats
- 'merge': Merge two config files
- 'diff': Compare two files
- 'keys': List all keys in file
- 'format': Prettify/reformat file

Supported formats: .yaml, .yml, .toml, .json

Examples:

1. Read entire file:
{ operation: 'get', path: 'config.yaml' }

2. Get specific key:
{ operation: 'get', path: 'config.yaml', query: 'database.host' }

3. Get nested array item:
{ operation: 'get', path: 'config.yaml', query: 'servers[0].name' }

4. Set value:
{ operation: 'set', path: 'config.yaml', query: 'database.port', value: 5432 }

5. Delete key:
{ operation: 'delete', path: 'config.yaml', query: 'deprecated_setting' }

6. Validate file:
{ operation: 'validate', path: 'config.toml' }

7. Convert YAML to JSON:
{ operation: 'convert', path: 'config.yaml', outputFormat: 'json', output: 'config.json' }

8. Convert TOML to YAML:
{ operation: 'convert', path: 'Cargo.toml', outputFormat: 'yaml' }

9. Merge configs (deep):
{ operation: 'merge', path: 'base.yaml', mergeWithFile: 'override.yaml', output: 'merged.yaml' }

10. Diff two files:
{ operation: 'diff', path: 'old.yaml', compareTo: 'new.yaml' }

11. List all keys:
{ operation: 'keys', path: 'config.yaml' }

12. Format/prettify:
{ operation: 'format', path: 'messy.yaml' }`,

  inputSchema: {
    type: "object" as const,
    properties: {
      operation: {
        type: "string",
        enum: ["get", "set", "delete", "validate", "convert", "merge", "diff", "keys", "format"],
        description: "YAML/TOML operation to perform"
      },
      path: {
        type: "string",
        description: "Path to config file"
      },
      query: {
        type: "string",
        description: "Key path using dot notation (e.g., 'database.host')"
      },
      value: {
        description: "Value to set (any type)"
      },
      format: {
        type: "string",
        enum: ["yaml", "toml", "json"],
        description: "Force input format (auto-detected by default)"
      },
      outputFormat: {
        type: "string",
        enum: ["yaml", "toml", "json"],
        description: "Output format for convert operation"
      },
      output: {
        type: "string",
        description: "Output file path (defaults to input file)"
      },
      mergeWith: {
        type: "object",
        description: "Object to merge (inline)"
      },
      mergeWithFile: {
        type: "string",
        description: "Path to file to merge with"
      },
      compareTo: {
        type: "string",
        description: "Second file path for diff operation"
      },
      strategy: {
        type: "string",
        enum: ["deep", "shallow", "replace"],
        description: "Merge strategy (default: deep)"
      },
      indent: {
        type: "number",
        description: "Indentation level (default: 2)"
      },
      limit: {
        type: "number",
        description: "Limit number of keys shown (default: 50)"
      }
    },
    required: ["operation"]
  }
};

export const hashTool: Tool = {
  name: "hash_tool",
  description: `File hashing and verification - MD5, SHA1, SHA256, SHA512.

Operations:
- 'hash': Calculate hash of a file
- 'verify': Verify file against expected hash
- 'compare': Compare two files by hash
- 'multiple': Hash multiple files at once
- 'string': Hash a string/text

Examples:

1. Hash a file (default SHA256):
{ operation: 'hash', path: 'D:/Models/model.safetensors' }

2. Hash with specific algorithm:
{ operation: 'hash', path: 'D:/file.bin', algorithm: 'md5' }

3. Verify a download:
{ operation: 'verify', path: 'D:/model.gguf', expected: 'abc123...', algorithm: 'sha256' }

4. Compare two files:
{ operation: 'compare', file1: 'D:/file1.bin', file2: 'D:/file2.bin' }

5. Hash multiple files:
{ operation: 'multiple', paths: ['D:/a.txt', 'D:/b.txt', 'D:/c.txt'] }

6. Hash a string:
{ operation: 'string', data: 'Hello World', algorithm: 'md5' }`,

  inputSchema: {
    type: "object" as const,
    properties: {
      operation: {
        type: "string",
        enum: ["hash", "verify", "compare", "multiple", "string"],
        description: "Hash operation to perform"
      },
      path: {
        type: "string",
        description: "File path (for hash/verify)"
      },
      paths: {
        type: "array",
        items: { type: "string" },
        description: "File paths (for multiple)"
      },
      file1: {
        type: "string",
        description: "First file (for compare)"
      },
      file2: {
        type: "string",
        description: "Second file (for compare)"
      },
      expected: {
        type: "string",
        description: "Expected hash value (for verify)"
      },
      data: {
        type: "string",
        description: "String data to hash (for string)"
      },
      algorithm: {
        type: "string",
        enum: ["md5", "sha1", "sha256", "sha512"],
        description: "Hash algorithm (default: sha256)"
      }
    },
    required: ["operation"]
  }
};

export const modelTool: Tool = {
  name: "model_tool",
  description: `AI model metadata inspection - Safetensors and GGUF formats.

Inspect AI models WITHOUT loading them into memory. Read headers, metadata, tensor info.

Operations:
- 'info': Get detailed info about a single model
- 'list': List all models in a directory
- 'compare': Compare two models
- 'search': Search for models by name/architecture

Examples:

1. Get model info:
{ operation: 'info', path: 'D:/Models/llm/gguf/mistral-7b.Q4_K_M.gguf' }

2. Get info with tensor list:
{ operation: 'info', path: 'D:/Models/image/base/model.safetensors', tensors: true }

3. Get GGUF with full metadata:
{ operation: 'info', path: 'D:/Models/llm/gguf/model.gguf', metadata: true }

4. List all models in directory:
{ operation: 'list', path: 'D:/Models/llm/gguf' }

5. List models recursively:
{ operation: 'list', path: 'D:/Models', recursive: true }

6. Compare two models:
{ operation: 'compare', path1: 'D:/Models/model-q4.gguf', path2: 'D:/Models/model-q8.gguf' }

7. Search for models:
{ operation: 'search', path: 'D:/Models', query: 'llama' }

Returns: Architecture, quantization, parameters, context length, tensor count, metadata.`,

  inputSchema: {
    type: "object" as const,
    properties: {
      operation: {
        type: "string",
        enum: ["info", "list", "compare", "search"],
        description: "Model operation to perform"
      },
      path: {
        type: "string",
        description: "Path to model file or directory"
      },
      path1: {
        type: "string",
        description: "First model path (for compare)"
      },
      path2: {
        type: "string",
        description: "Second model path (for compare)"
      },
      query: {
        type: "string",
        description: "Search query (for search)"
      },
      recursive: {
        type: "boolean",
        description: "Recurse into subdirectories (default: true)"
      },
      tensors: {
        type: "boolean",
        description: "Include tensor list in output"
      },
      metadata: {
        type: "boolean",
        description: "Include full metadata in output"
      },
      limit: {
        type: "number",
        description: "Limit number of tensors/metadata shown (default: 20)"
      }
    },
    required: ["operation"]
  }
};

export const clipboardTool: Tool = {
  name: "clipboard_tool",
  description: `System clipboard operations - copy text, read clipboard, copy files.

Operations:
- 'copy': Copy text to clipboard
- 'read': Read text from clipboard (alias: 'paste')
- 'type': Check what type of content is in clipboard
- 'clear': Clear the clipboard
- 'copy-files': Copy file paths to clipboard (for pasting in Explorer)
- 'get-files': Get file paths from clipboard

Examples:

1. Copy text to clipboard:
{ operation: 'copy', text: 'Hello World!' }

2. Copy code to clipboard:
{ operation: 'copy', text: 'npm install express' }

3. Read clipboard contents:
{ operation: 'read' }

4. Check clipboard type:
{ operation: 'type' }

5. Clear clipboard:
{ operation: 'clear' }

6. Copy file paths (for Explorer paste):
{ operation: 'copy-files', files: ['D:/Projects/file1.txt', 'D:/Projects/file2.txt'] }

7. Get files from clipboard:
{ operation: 'get-files' }`,

  inputSchema: {
    type: "object" as const,
    properties: {
      operation: {
        type: "string",
        enum: ["copy", "read", "paste", "type", "clear", "copy-files", "get-files"],
        description: "Clipboard operation to perform"
      },
      text: {
        type: "string",
        description: "Text to copy (for copy operation)"
      },
      files: {
        type: "array",
        items: { type: "string" },
        description: "File paths to copy (for copy-files operation)"
      }
    },
    required: ["operation"]
  }
};

export const diffTool: Tool = {
  name: "diff_tool",
  description: `Compare files and directories - show differences, track changes.

Operations:
- 'files': Compare two text files line-by-line
- 'dirs': Compare two directories (what's different, missing, identical)
- 'stat': Compare file statistics (size, modification time)
- 'quick': Fast identical/different check (size then content)

Examples:

1. Compare two files:
{ operation: 'files', path1: 'D:/old-config.yaml', path2: 'D:/new-config.yaml' }

2. Compare with more context lines:
{ operation: 'files', path1: 'D:/v1.js', path2: 'D:/v2.js', context: 5 }

3. Get unified diff format:
{ operation: 'files', path1: 'D:/old.txt', path2: 'D:/new.txt', unified: true }

4. Compare directories:
{ operation: 'dirs', path1: 'D:/ProjectV1', path2: 'D:/ProjectV2' }

5. Quick check if files match:
{ operation: 'quick', path1: 'D:/backup.zip', path2: 'D:/archive.zip' }

6. Compare file stats:
{ operation: 'stat', path1: 'D:/file1.bin', path2: 'D:/file2.bin' }`,

  inputSchema: {
    type: "object" as const,
    properties: {
      operation: {
        type: "string",
        enum: ["files", "dirs", "stat", "quick"],
        description: "Diff operation to perform"
      },
      path1: {
        type: "string",
        description: "First file or directory path"
      },
      path2: {
        type: "string",
        description: "Second file or directory path"
      },
      context: {
        type: "number",
        description: "Context lines around changes (default: 3)"
      },
      unified: {
        type: "boolean",
        description: "Output in unified diff format"
      },
      limit: {
        type: "number",
        description: "Limit number of changes shown (default: 100)"
      }
    },
    required: ["operation", "path1", "path2"]
  }
};
