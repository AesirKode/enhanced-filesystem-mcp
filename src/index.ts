#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

// Core modules
import { CacheManager } from './core/cache.js';
import { ParallelExecutor } from './core/executor.js';
import { TransactionManager } from './core/transaction.js';
import { FileReader } from './core/reader.js';
import { FileWriter } from './core/writer.js';
import { editFile } from './core/editor.js';
import { listDirectory } from './core/lister.js';
import { search } from './core/searcher.js';
import { executeGitOperation } from './core/git.js';
import { executeBatchOperations } from './core/batch.js';

// NEW: Additional core modules
import { executeOllamaOperation } from './core/ollama.js';
import { executeHttpRequest, formatHttpResponse } from './core/http-client.js';
import { executeJsonOperation } from './core/json-deep.js';
import { executeProcessOperation } from './core/process-manager.js';
import { getComfyUIClient } from './core/comfyui.js';
import { executeArchiveOperation } from './core/archive.js';
import { executeHashOperation } from './core/hash.js';
import { executeClipboardOperation } from './core/clipboard.js';
import { executeDownloadOperation } from './core/download.js';
import { executeModelOperation } from './core/model.js';
import { executeYamlOperation } from './core/yaml.js';
import { executeDiffOperation } from './core/diff.js';
import { executeWindowsOperation, WindowsToolArgs } from './core/windows.js';
import { executeSqliteOperation } from './tools/sqlite-ops.js';
import { pythonSessionManager } from './core/python-session.js';

// Tool handlers
import { setupFileTools } from './tools/file-ops.js';
import { setupSearchTools } from './tools/search-ops.js';
import { setupBatchTools } from './tools/batch-ops.js';
import { setupGitTools } from './tools/git-ops.js';
import { setupProcessTools } from './tools/process-ops.js';

// NEW: Additional tool handlers
import { setupOllamaTools } from './tools/ollama-ops.js';
import { setupHttpTools } from './tools/http-ops.js';
import { setupJsonTools } from './tools/json-ops.js';
import { comfyuiTool, ComfyUIToolArgs } from './tools/comfyui-ops.js';
import { archiveTool, hashTool, clipboardTool, modelTool, yamlTool, diffTool } from './tools/utility-ops.js';
import { downloadTool } from './tools/download-ops.js';
import { windowsTool } from './tools/windows-ops.js';
import { analysisTool, executeAnalysisOperation } from './tools/analysis-ops.js';
import { sqliteTool } from './tools/sqlite-ops.js';
import { sshTool, executeSshOperation } from './tools/ssh-ops.js';

// Process execution
import { executeCommand, executePython } from './process/simple-exec.js';

import { promises as fs } from 'fs';

interface ServerConfig {
  allowedDirectories: string[];
  cacheSize: number;
  maxParallelOps: number;
}

// Default configuration
const config: ServerConfig = {
  allowedDirectories: process.env.ALLOWED_DIRS?.split(',') || [],
  cacheSize: parseInt(process.env.CACHE_SIZE || '100'),
  maxParallelOps: parseInt(process.env.MAX_PARALLEL || '16'),
};

// Initialize core systems
const cache = new CacheManager(config.cacheSize);
const executor = new ParallelExecutor(config.maxParallelOps);
const transactionManager = new TransactionManager();
const fileReader = new FileReader(cache);
const fileWriter = new FileWriter(cache);

// Create MCP server
const server = new Server(
  {
    name: 'enhanced-filesystem',
    version: '0.10.0',  // Added windows_tool
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Store all tools
const tools: Tool[] = [];

// Setup tool handlers
function registerTools() {
  // File operations
  tools.push(...setupFileTools(cache, executor, config));

  // Search operations
  tools.push(...setupSearchTools());

  // Batch operations
  tools.push(...setupBatchTools(transactionManager, config));

  // Git operations
  tools.push(...setupGitTools(cache, config));

  // Process operations (includes efs_exec, efs_python, process_tool)
  tools.push(...setupProcessTools());

  // NEW: Ollama operations
  tools.push(...setupOllamaTools());

  // NEW: HTTP operations
  tools.push(...setupHttpTools());

  // NEW: JSON operations
  tools.push(...setupJsonTools());

  // NEW: ComfyUI operations
  tools.push(comfyuiTool);

  // NEW: Utility tools (archive, hash, clipboard, download, model, yaml)
  tools.push(archiveTool);
  tools.push(hashTool);
  tools.push(clipboardTool);
  tools.push(downloadTool);
  tools.push(modelTool);
  tools.push(yamlTool);
  tools.push(diffTool);
  tools.push(windowsTool);
  tools.push(analysisTool);
  tools.push(sqliteTool);
  tools.push(sshTool);
}

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // File operations
      case 'efs_read':
        return await handleRead(args);
      case 'efs_write':
        return await handleWrite(args);
      case 'efs_edit':
        return await handleEdit(args);
      case 'efs_list':
        return await handleList(args);
      case 'efs_info':
        return await handleInfo(args);
      case 'efs_delete':
        return await handleDelete(args);
      case 'efs_move':
        return await handleMove(args);

      // Search operations
      case 'efs_search':
        return await handleSearch(args);

      // Process operations
      case 'efs_exec':
        return await handleExec(args);
      case 'efs_python':
        return await handlePython(args);

      // Batch & Git
      case 'efs_batch':
        return await handleBatch(args);
      case 'efs_git':
        return await handleGit(args);

      // NEW: Ollama operations
      case 'ollama_tool':
        return await handleOllama(args);

      // NEW: HTTP operations
      case 'http_tool':
        return await handleHttp(args);

      // NEW: Process manager (GPU, services)
      case 'process_tool':
        return await handleProcess(args);

      // NEW: JSON operations
      case 'json_tool':
        return await handleJson(args);

      // NEW: ComfyUI operations
      case 'comfyui_tool':
        return await handleComfyUI(args as unknown as ComfyUIToolArgs);

      // NEW: Utility operations
      case 'archive_tool':
        return await handleArchive(args);
      case 'hash_tool':
        return await handleHash(args);
      case 'clipboard_tool':
        return await handleClipboard(args);
      case 'download_tool':
        return await handleDownload(args);
      case 'model_tool':
        return await handleModel(args);
      case 'yaml_tool':
        return await handleYaml(args);
      case 'diff_tool':
        return await handleDiff(args);

      // Windows automation
      case 'windows_tool':
        return await handleWindows(args as unknown as WindowsToolArgs);

      // Code analysis
      case 'analysis_tool':
        return await handleAnalysis(args);

      // SQLite
      case 'sqlite_tool':
        return await handleSqlite(args);

      // SSH
      case 'ssh_tool':
        return await handleSsh(args);

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// File operations
async function handleRead(args: any) {
  try {
    const { path: filePath, offset, length, encoding } = args;

    const result = await fileReader.read(filePath, {
      offset,
      length,
      encoding,
    });

    const statsInfo = [
      `File: ${filePath}`,
      `Size: ${result.stats.size} bytes`,
      result.stats.lines ? `Lines: ${result.stats.lines}` : '',
    ].filter(Boolean).join(' | ');

    return {
      content: [
        {
          type: 'text',
          text: `${statsInfo}\n\n${result.content}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error reading file: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

async function handleWrite(args: any) {
  try {
    const { path: filePath, content, mode, encoding } = args;

    const result = await fileWriter.write(filePath, content, {
      mode,
      encoding,
    });

    const sizeInKB = (result.bytesWritten / 1024).toFixed(2);
    const sizeInMB = (result.bytesWritten / 1024 / 1024).toFixed(2);

    const sizeStr = result.bytesWritten > 1024 * 1024
      ? `${sizeInMB} MB`
      : `${sizeInKB} KB`;

    return {
      content: [
        {
          type: 'text',
          text: `✅ Successfully wrote ${sizeStr} to ${filePath}\n\nMode: ${mode || 'rewrite'}\nNo chunking required - handled ${result.bytesWritten.toLocaleString()} bytes in single operation!`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error writing file: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

async function handleEdit(args: any) {
  try {
    const { path: filePath, oldText, newText, count } = args;

    const result = await editFile(filePath, {
      oldText,
      newText,
      count,
    });

    return {
      content: [
        {
          type: 'text',
          text: `✅ Edit successful: ${filePath}\n\nReplacements: ${result.replacements}\nOriginal size: ${result.originalSize} bytes\nNew size: ${result.newSize} bytes`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error editing file: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

async function handleList(args: any) {
  try {
    const { path: dirPath, depth, pattern, sortBy } = args;

    const entries = await listDirectory(dirPath, {
      depth,
      pattern,
      sortBy,
    });

    const output = entries.map((entry) => {
      const type = entry.type === 'directory' ? '[DIR]' : '[FILE]';
      const size = entry.size ? ` (${(entry.size / 1024).toFixed(2)} KB)` : '';
      return `${type} ${entry.path}${size}`;
    }).join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `Directory: ${dirPath}\nTotal entries: ${entries.length}\n\n${output}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error listing directory: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

async function handleInfo(args: any) {
  try {
    const { path: filePath } = args;

    const stats = await fs.stat(filePath);

    const info = [
      `Path: ${filePath}`,
      `Type: ${stats.isDirectory() ? 'Directory' : 'File'}`,
      `Size: ${(stats.size / 1024).toFixed(2)} KB`,
      `Created: ${stats.birthtime.toISOString()}`,
      `Modified: ${stats.mtime.toISOString()}`,
    ];

    return {
      content: [
        {
          type: 'text',
          text: info.join('\n'),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error getting file info: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

async function handleDelete(args: any) {
  try {
    const { path: filePath, recursive } = args;

    if (recursive) {
      await fs.rm(filePath, { recursive: true, force: true });
    } else {
      await fs.unlink(filePath);
    }

    return {
      content: [
        {
          type: 'text',
          text: `✅ Deleted: ${filePath}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error deleting: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

async function handleMove(args: any) {
  try {
    const { source, destination } = args;

    await fs.rename(source, destination);

    return {
      content: [
        {
          type: 'text',
          text: `✅ Moved: ${source} → ${destination}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error moving file: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

async function handleSearch(args: any) {
  try {
    const {
      path: searchPath,
      pattern,
      searchType = 'smart',
      filePattern,
      maxResults,
      contextLines,
      caseSensitive
    } = args;

    const results = await search(searchPath, {
      pattern,
      searchType,
      filePattern,
      maxResults,
      contextLines,
      caseSensitive,
    });

    if (results.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No results found for "${pattern}" in ${searchPath}`,
          },
        ],
      };
    }

    const output: string[] = [];
    output.push(`Search results for "${pattern}" in ${searchPath}`);
    output.push(`Found ${results.length} matches:\n`);

    for (const result of results) {
      if (result.type === 'file') {
        output.push(`[FILE] ${result.path}`);
      } else if (result.type === 'content' && result.matches) {
        output.push(`\n[FILE] ${result.path}`);
        for (const match of result.matches.slice(0, 3)) {
          output.push(`  Line ${match.line}: ${match.text.trim()}`);
        }
        if (result.matches.length > 3) {
          output.push(`  ... and ${result.matches.length - 3} more matches`);
        }
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: output.join('\n'),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error searching: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

// Process operations
async function handleExec(args: any) {
  try {
    const { command, cwd, timeout } = args;

    const result = await executeCommand(command, { cwd, timeout });

    const output = result.stdout || result.stderr;

    return {
      content: [
        {
          type: 'text',
          text: `Command: ${command}\nExit Code: ${result.exitCode}\nDuration: ${result.duration}ms\n\n${output}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error executing command: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

async function handleGit(args: any) {
  try {
    const result = await executeGitOperation(args);

    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Git operation failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

async function handleBatch(args: any) {
  try {
    const result = await executeBatchOperations(args);

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Batch operation failed:\n${result.errors.join('\n')}\n\nPartial results: ${JSON.stringify(result.results, null, 2)}`,
          },
        ],
        isError: true,
      };
    }

    const output: string[] = [];
    output.push(`✅ Batch operation completed successfully`);
    output.push(`Operations: ${result.results.length}`);
    output.push(`\nResults:`);

    result.results.forEach((r, i) => {
      output.push(`\n${i + 1}. ${r.op} - ${r.path || r.from || 'N/A'}`);
      if (r.content) {
        output.push(`   Content length: ${r.content.length} bytes`);
      }
      if (r.replacements !== undefined) {
        output.push(`   Replacements: ${r.replacements}`);
      }
      if (r.size !== undefined) {
        output.push(`   Size: ${r.size} bytes`);
      }
    });

    return {
      content: [
        {
          type: 'text',
          text: output.join('\n'),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Batch operation error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

async function handlePython(args: any) {
  try {
    const { code, cwd, timeout, sessionId, restart } = args;

    if (sessionId) {
      if (restart) {
        pythonSessionManager.killSession(sessionId);
      }

      const result = await pythonSessionManager.execute(sessionId, code, timeout);

      const output = result.stdout || result.stderr;
      return {
        content: [
          {
            type: 'text',
            text: `Python Session '${sessionId}':\n\n${output}`,
          },
        ],
      };
    }

    const result = await executePython(code, { cwd, timeout });

    const output = result.stdout || result.stderr;

    return {
      content: [
        {
          type: 'text',
          text: `Python code executed:\nExit Code: ${result.exitCode}\nDuration: ${result.duration}ms\n\n${output}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error executing Python: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

async function handleSqlite(args: any) {
  try {
    const result = await executeSqliteOperation(args);
    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `SQLite error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

async function handleSsh(args: any) {
  try {
    const result = await executeSshOperation(args);
    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `SSH error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

// NEW: Ollama handler
async function handleOllama(args: any) {
  try {
    const result = await executeOllamaOperation(args);

    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Ollama operation failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

// NEW: HTTP handler
async function handleHttp(args: any) {
  try {
    const response = await executeHttpRequest(args);
    const formatted = formatHttpResponse(response);

    return {
      content: [
        {
          type: 'text',
          text: formatted,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `HTTP request failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

// NEW: Process manager handler
async function handleProcess(args: any) {
  try {
    const result = await executeProcessOperation(args);

    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Process operation failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

// NEW: JSON handler
async function handleJson(args: any) {
  try {
    const result = await executeJsonOperation(args);

    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `JSON operation failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

// NEW: ComfyUI handler
async function handleComfyUI(args: ComfyUIToolArgs) {
  try {
    const client = getComfyUIClient(args.config);

    switch (args.operation) {
      case 'status': {
        const [stats, queue] = await Promise.all([
          client.getSystemStats(),
          client.getQueue()
        ]);

        const output: string[] = ['=== ComfyUI Status ==='];

        // System info
        if (stats.system) {
          output.push(`\nSystem: ${stats.system.os}`);
          if (stats.system.comfyui_version) {
            output.push(`ComfyUI: ${stats.system.comfyui_version}`);
          }
          output.push(`Python: ${stats.system.python_version}`);
          output.push(`PyTorch: ${stats.system.pytorch_version}`);
          if (stats.system.ram_total) {
            const ramUsed = stats.system.ram_total - stats.system.ram_free;
            output.push(`RAM: ${(ramUsed / 1024 / 1024 / 1024).toFixed(2)} / ${(stats.system.ram_total / 1024 / 1024 / 1024).toFixed(2)} GB`);
          }
        }

        // GPU info
        if (stats.devices && stats.devices.length > 0) {
          output.push('\nGPU Devices:');
          for (const device of stats.devices) {
            const vramUsed = device.vram_total - device.vram_free;
            const vramPercent = ((vramUsed / device.vram_total) * 100).toFixed(1);
            output.push(`  ${device.name} (${device.type})`);
            output.push(`    VRAM: ${(vramUsed / 1024 / 1024 / 1024).toFixed(2)} / ${(device.vram_total / 1024 / 1024 / 1024).toFixed(2)} GB (${vramPercent}%)`);
            if (device.torch_vram_total) {
              const torchUsed = device.torch_vram_total - device.torch_vram_free;
              output.push(`    Torch VRAM: ${(torchUsed / 1024 / 1024 / 1024).toFixed(2)} / ${(device.torch_vram_total / 1024 / 1024 / 1024).toFixed(2)} GB`);
            }
          }
        }

        // Queue info
        output.push(`\nQueue: ${queue.queue_running?.length || 0} running, ${queue.queue_pending?.length || 0} pending`);

        return { content: [{ type: 'text', text: output.join('\n') }] };
      }

      case 'queue': {
        let workflow = args.workflow;

        // Load from file if path provided
        if (args.workflowPath) {
          const workflowContent = await fs.readFile(args.workflowPath, 'utf-8');
          workflow = JSON.parse(workflowContent);
        }

        if (!workflow) {
          throw new Error('Either workflow or workflowPath must be provided');
        }

        const result = await client.queuePrompt(workflow);

        return {
          content: [{
            type: 'text',
            text: `✅ Workflow queued!\n\nPrompt ID: ${result.prompt_id}\nQueue Position: ${result.number}`
          }]
        };
      }

      case 'history': {
        const history = await client.getHistory(args.promptId, args.maxItems || 10);

        const output: string[] = ['=== Generation History ==='];

        for (const [promptId, entry] of Object.entries(history)) {
          output.push(`\nPrompt: ${promptId}`);
          output.push(`  Status: ${entry.status?.completed ? '✅ Complete' : '⏳ In Progress'}`);

          // Count outputs
          let imageCount = 0;
          for (const nodeOutput of Object.values(entry.outputs)) {
            if ((nodeOutput as any).images) {
              imageCount += (nodeOutput as any).images.length;
            }
          }
          if (imageCount > 0) {
            output.push(`  Images: ${imageCount}`);
          }
        }

        return { content: [{ type: 'text', text: output.join('\n') }] };
      }

      case 'interrupt': {
        await client.interrupt(args.promptId);
        const msg = args.promptId 
          ? `⏹️ Interrupted prompt: ${args.promptId}`
          : '⏹️ Generation interrupted';
        return { content: [{ type: 'text', text: msg }] };
      }

      case 'clear': {
        if (args.target === 'queue') {
          await client.clearQueue();
          return { content: [{ type: 'text', text: '🗑️ Queue cleared' }] };
        } else if (args.target === 'history') {
          await client.clearHistory();
          return { content: [{ type: 'text', text: '🗑️ History cleared' }] };
        } else {
          throw new Error('target must be "queue" or "history"');
        }
      }

      case 'upload': {
        if (!args.imagePath) {
          throw new Error('imagePath is required');
        }
        const result = await client.uploadImage(
          args.imagePath, 
          args.subfolder,
          args.overwrite || false,
          args.uploadType || 'input'
        );
        return {
          content: [{
            type: 'text',
            text: `✅ Image uploaded!\n\nName: ${result.name}\nSubfolder: ${result.subfolder || '(root)'}\nType: ${result.type}`
          }]
        };
      }

      case 'mask': {
        if (!args.maskPath || !args.originalRef) {
          throw new Error('maskPath and originalRef are required');
        }
        const result = await client.uploadMask(args.maskPath, args.originalRef);
        return {
          content: [{
            type: 'text',
            text: `✅ Mask uploaded!\n\nName: ${result.name}\nSubfolder: ${result.subfolder || '(root)'}\nType: ${result.type}`
          }]
        };
      }

      case 'download': {
        if (!args.filename || !args.outputPath) {
          throw new Error('filename and outputPath are required');
        }
        const savedPath = await client.saveImage(
          args.filename,
          args.outputPath,
          args.subfolder || '',
          args.folderType || 'output'
        );
        return { content: [{ type: 'text', text: `✅ Image saved to: ${savedPath}` }] };
      }

      case 'preview': {
        if (!args.filename || !args.outputPath) {
          throw new Error('filename and outputPath are required');
        }
        const previewData = await client.getImagePreview(
          args.filename,
          args.subfolder || '',
          args.folderType || 'output',
          args.previewFormat || 'webp',
          args.previewQuality || 90
        );
        await fs.writeFile(args.outputPath, previewData);
        return { content: [{ type: 'text', text: `✅ Preview saved to: ${args.outputPath}` }] };
      }

      case 'nodes': {
        const info = await client.getObjectInfo(args.nodeClass);

        if (args.nodeClass) {
          // Specific node info
          return {
            content: [{
              type: 'text',
              text: `Node: ${args.nodeClass}\n\n${JSON.stringify(info[args.nodeClass], null, 2)}`
            }]
          };
        } else {
          // List all nodes
          const nodeNames = Object.keys(info).sort();
          return {
            content: [{
              type: 'text',
              text: `Available Nodes (${nodeNames.length}):\n\n${nodeNames.join('\n')}`
            }]
          };
        }
      }

      case 'wait': {
        let workflow = args.workflow;

        if (args.workflowPath) {
          const workflowContent = await fs.readFile(args.workflowPath, 'utf-8');
          workflow = JSON.parse(workflowContent);
        }

        if (!workflow) {
          throw new Error('Either workflow or workflowPath must be provided');
        }

        // Queue the workflow
        const queueResult = await client.queuePrompt(workflow);

        // Wait for completion
        await client.waitForPrompt(
          queueResult.prompt_id,
          1000, // poll every 1 second
          args.timeout || 300000 // 5 min default timeout
        );

        // Get output images
        const images = await client.getOutputImages(queueResult.prompt_id);

        const output: string[] = [
          `✅ Generation complete!`,
          `Prompt ID: ${queueResult.prompt_id}`,
          `\nOutput Images (${images.length}):`
        ];

        for (const img of images) {
          output.push(`  - ${img.filename}${img.subfolder ? ` (${img.subfolder})` : ''}`);
        }

        return { content: [{ type: 'text', text: output.join('\n') }] };
      }

      // ============ NEW OPERATIONS ============

      case 'models': {
        if (args.modelFolder) {
          // List models in specific folder
          const models = await client.getModels(args.modelFolder);
          const modelList = Array.isArray(models) ? models : [];
          
          // Check if detailed format
          if (modelList.length > 0 && typeof modelList[0] === 'object') {
            const output: string[] = [`=== ${args.modelFolder} Models (${modelList.length}) ===`];
            for (const m of modelList as any[]) {
              const sizeStr = m.size ? ` (${(m.size / 1024 / 1024 / 1024).toFixed(2)} GB)` : '';
              output.push(`  ${m.name}${sizeStr}`);
            }
            return { content: [{ type: 'text', text: output.join('\n') }] };
          } else {
            return {
              content: [{
                type: 'text',
                text: `=== ${args.modelFolder} Models (${modelList.length}) ===\n\n${modelList.join('\n')}`
              }]
            };
          }
        } else {
          // List model folder types
          const types = await client.getModelTypes();
          return {
            content: [{
              type: 'text',
              text: `=== Model Folders ===\n\n${types.join('\n')}`
            }]
          };
        }
      }

      case 'free': {
        await client.freeMemory({
          unload_models: args.unloadModels ?? true,
          free_memory: args.freeMemory ?? true
        });
        return { content: [{ type: 'text', text: '🧹 VRAM freed! Models unloaded.' }] };
      }

      case 'embeddings': {
        const embeddings = await client.getEmbeddings();
        return {
          content: [{
            type: 'text',
            text: `=== Embeddings (${embeddings.length}) ===\n\n${embeddings.join('\n')}`
          }]
        };
      }

      case 'metadata': {
        if (!args.modelFolder || !args.modelFile) {
          throw new Error('modelFolder and modelFile are required');
        }
        if (!args.modelFile.endsWith('.safetensors')) {
          throw new Error('modelFile must be a .safetensors file');
        }
        const metadata = await client.getModelMetadata(args.modelFolder, args.modelFile);
        return {
          content: [{
            type: 'text',
            text: `=== Metadata: ${args.modelFile} ===\n\n${JSON.stringify(metadata, null, 2)}`
          }]
        };
      }

      case 'features': {
        const features = await client.getFeatures();
        return {
          content: [{
            type: 'text',
            text: `=== Server Features ===\n\n${JSON.stringify(features, null, 2)}`
          }]
        };
      }

      case 'jobs': {
        if (args.jobId) {
          // Get specific job
          const job = await client.getJob(args.jobId);
          return {
            content: [{
              type: 'text',
              text: `=== Job: ${args.jobId} ===\n\n${JSON.stringify(job, null, 2)}`
            }]
          };
        } else {
          // List jobs with filtering
          const result = await client.getJobs({
            status: args.jobStatus,
            sort_by: args.jobSortBy,
            sort_order: args.jobSortOrder,
            limit: args.jobLimit,
            offset: args.jobOffset
          });

          const output: string[] = [`=== Jobs (${result.jobs.length} of ${result.pagination.total}) ===`];
          
          for (const job of result.jobs) {
            output.push(`\n${job.id}: ${job.status}`);
          }

          if (result.pagination.has_more) {
            output.push(`\n(More jobs available, use offset=${result.pagination.offset + result.jobs.length})`);
          }

          return { content: [{ type: 'text', text: output.join('\n') }] };
        }
      }

      case 'templates': {
        const templates = await client.getWorkflowTemplates();
        const output: string[] = ['=== Workflow Templates ==='];
        
        for (const [nodePack, workflows] of Object.entries(templates)) {
          output.push(`\n${nodePack}:`);
          for (const wf of workflows) {
            output.push(`  - ${wf}`);
          }
        }

        return { content: [{ type: 'text', text: output.join('\n') }] };
      }

      case 'agent': {
        if (!args.agentRequest) {
          throw new Error('agentRequest is required - describe what image you want to generate');
        }

        // Import the agent dynamically
        const { getComfyUIAgent } = await import('./core/comfyui-agent.js');
        
        const agent = getComfyUIAgent({
          llmBackend: args.agentConfig?.llmBackend || 'ollama',
          llmHost: args.agentConfig?.llmHost || 'localhost',
          llmPort: args.agentConfig?.llmPort || 11434,
          llmModel: args.agentConfig?.llmModel || 'dolphin-mistral-nemo',
          comfyHost: args.config?.host,
          comfyPort: args.config?.port
        });

        const result = await agent.generate(args.agentRequest, {
          checkpoint: args.checkpoint,
          width: args.width,
          height: args.height,
          steps: args.steps,
          cfg: args.cfgScale,
          waitForResult: args.agentWait,
          timeout: args.timeout,
          outputDir: args.agentOutputDir
        });

        const output: string[] = ['=== ComfyUI Agent Generation ==='];
        output.push(`\nRequest: "${args.agentRequest}"`);
        output.push(`Prompt ID: ${result.promptId}`);
        output.push(`\n--- Generated Parameters ---`);
        output.push(`Prompt: ${result.params.prompt}`);
        output.push(`Negative: ${result.params.negativePrompt || '(default)'}`);
        output.push(`Size: ${result.params.width || 1024}x${result.params.height || 1024}`);
        output.push(`Steps: ${result.params.steps || 20}`);
        output.push(`CFG: ${result.params.cfg || 7}`);

        if (result.images) {
          output.push(`\n--- Output Images ---`);
          for (const img of result.images) {
            output.push(`  ${img}`);
          }
        } else {
          output.push(`\n(Generation queued - use agentWait: true to wait for result)`);
        }

        return { content: [{ type: 'text', text: output.join('\n') }] };
      }

      default:
        throw new Error(`Unknown ComfyUI operation: ${args.operation}`);
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `ComfyUI operation failed: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
}

// NEW: Archive handler
async function handleArchive(args: any) {
  try {
    const result = await executeArchiveOperation(args);
    return { content: [{ type: 'text', text: result }] };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Archive operation failed: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
}

// NEW: Hash handler
async function handleHash(args: any) {
  try {
    const result = await executeHashOperation(args);
    return { content: [{ type: 'text', text: result }] };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Hash operation failed: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
}

// NEW: Clipboard handler
async function handleClipboard(args: any) {
  try {
    const result = await executeClipboardOperation(args);
    return { content: [{ type: 'text', text: result }] };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Clipboard operation failed: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
}

// NEW: Download handler
async function handleDownload(args: any) {
  try {
    const result = await executeDownloadOperation(args);
    return { content: [{ type: 'text', text: result }] };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Download operation failed: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
}

// NEW: Model handler
async function handleModel(args: any) {
  try {
    const result = await executeModelOperation(args);
    return { content: [{ type: 'text', text: result }] };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Model operation failed: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
}

// NEW: YAML handler
async function handleYaml(args: any) {
  try {
    const result = await executeYamlOperation(args);
    return { content: [{ type: 'text', text: result }] };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `YAML operation failed: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
}

// NEW: Diff handler
async function handleDiff(args: any) {
  try {
    const result = await executeDiffOperation(args);
    return { content: [{ type: 'text', text: result }] };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Diff operation failed: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
}

// NEW: Windows automation handler
async function handleWindows(args: WindowsToolArgs) {
  try {
    const result = await executeWindowsOperation(args);
    return { content: [{ type: 'text', text: result }] };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Windows operation failed: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
}

async function handleAnalysis(args: any) {
  try {
    const result = await executeAnalysisOperation(args);
    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Analysis failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

// Start server
async function main() {
  console.error('Enhanced Filesystem MCP Server v0.9.0 starting...');
  console.error(`Config: ${JSON.stringify(config, null, 2)}`);

  registerTools();

  console.error(`Registered ${tools.length} tools`);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('Server ready!');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
