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
import { executeOllamaOperation } from './core/ollama.js';
import { executeHttpRequest, formatHttpResponse } from './core/http-client.js';
import { executeJsonOperation } from './core/json-deep.js';
import { executeProcessOperation } from './core/process-manager.js';
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
import { setupOllamaTools } from './tools/ollama-ops.js';
import { setupHttpTools } from './tools/http-ops.js';
import { setupJsonTools } from './tools/json-ops.js';
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

const config: ServerConfig = {
  allowedDirectories: process.env.ALLOWED_DIRS?.split(',') || [],
  cacheSize: parseInt(process.env.CACHE_SIZE || '100'),
  maxParallelOps: parseInt(process.env.MAX_PARALLEL || '20'),
};

// Initialize core systems
const cache = new CacheManager(config.cacheSize);
const executor = new ParallelExecutor(config.maxParallelOps);
const transactionManager = new TransactionManager();
const fileReader = new FileReader(cache);
const fileWriter = new FileWriter(cache);

// Create MCP server
const server = new Server(
  { name: 'enhanced-filesystem', version: '0.12.0' },
  { capabilities: { tools: {} } }
);

const tools: Tool[] = [];

function registerTools() {
  tools.push(...setupFileTools(cache, executor, config));
  tools.push(...setupSearchTools());
  tools.push(...setupBatchTools(transactionManager, config));
  tools.push(...setupGitTools(cache, config));
  tools.push(...setupProcessTools());
  tools.push(...setupOllamaTools());
  tools.push(...setupHttpTools());
  tools.push(...setupJsonTools());
  tools.push(archiveTool, hashTool, clipboardTool, downloadTool, modelTool, yamlTool, diffTool);
  tools.push(windowsTool, analysisTool, sqliteTool, sshTool);
}

// ── Shared response helpers ───────────────────────────────────────────────────

type MCPResponse = { content: { type: string; text: string }[]; isError?: boolean };

/** Wraps a single-string-returning async fn into an MCP response. */
async function wrap(label: string, fn: () => Promise<string>): Promise<MCPResponse> {
  try {
    return { content: [{ type: 'text', text: await fn() }] };
  } catch (error) {
    return {
      content: [{ type: 'text', text: `${label} failed: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
}

function errResponse(label: string, error: unknown): MCPResponse {
  return {
    content: [{ type: 'text', text: `Error ${label}: ${error instanceof Error ? error.message : String(error)}` }],
    isError: true,
  };
}

// ── Request handlers ──────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    switch (name) {
      case 'efs_read':     return await handleRead(args);
      case 'efs_write':    return await handleWrite(args);
      case 'efs_edit':     return await handleEdit(args);
      case 'efs_list':     return await handleList(args);
      case 'efs_info':     return await handleInfo(args);
      case 'efs_delete':   return await handleDelete(args);
      case 'efs_move':     return await handleMove(args);
      case 'efs_search':   return await handleSearch(args);
      case 'efs_exec':     return await handleExec(args);
      case 'efs_python':   return await handlePython(args);
      case 'efs_batch':    return await handleBatch(args);
      case 'efs_git':      return wrap('Git', () => executeGitOperation(args as any));
      case 'ollama_tool':  return wrap('Ollama', () => executeOllamaOperation(args as any));
      case 'process_tool': return wrap('Process', () => executeProcessOperation(args as any));
      case 'json_tool':    return wrap('JSON', () => executeJsonOperation(args as any));
      case 'archive_tool': return wrap('Archive', () => executeArchiveOperation(args as any));
      case 'hash_tool':    return wrap('Hash', () => executeHashOperation(args as any));
      case 'clipboard_tool': return wrap('Clipboard', () => executeClipboardOperation(args as any));
      case 'download_tool':  return wrap('Download', () => executeDownloadOperation(args as any));
      case 'model_tool':   return wrap('Model', () => executeModelOperation(args as any));
      case 'yaml_tool':    return wrap('YAML', () => executeYamlOperation(args as any));
      case 'diff_tool':    return wrap('Diff', () => executeDiffOperation(args as any));
      case 'windows_tool': return wrap('Windows', () => executeWindowsOperation(args as unknown as WindowsToolArgs));
      case 'analysis_tool': return wrap('Analysis', () => executeAnalysisOperation(args as any));
      case 'sqlite_tool':  return wrap('SQLite', () => executeSqliteOperation(args as any));
      case 'ssh_tool':     return wrap('SSH', () => executeSshOperation(args as any));
      case 'http_tool': {
        const response = await executeHttpRequest(args as any);
        return { content: [{ type: 'text', text: formatHttpResponse(response) }] };
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return errResponse('executing tool', error);
  }
});

// ── File operation handlers (non-trivial logic kept as functions) ─────────────

async function handleRead(args: any): Promise<MCPResponse> {
  try {
    const { path: filePath, offset, length, encoding } = args;
    const result = await fileReader.read(filePath, { offset, length, encoding });
    const statsInfo = [
      `File: ${filePath}`,
      `Size: ${result.stats.size} bytes`,
      result.stats.lines ? `Lines: ${result.stats.lines}` : '',
    ].filter(Boolean).join(' | ');
    return { content: [{ type: 'text', text: `${statsInfo}\n\n${result.content}` }] };
  } catch (error) {
    return errResponse('reading file', error);
  }
}

async function handleWrite(args: any): Promise<MCPResponse> {
  try {
    const { path: filePath, content, mode, encoding } = args;
    const result = await fileWriter.write(filePath, content, { mode, encoding });
    const sizeStr = result.bytesWritten > 1024 * 1024
      ? `${(result.bytesWritten / 1024 / 1024).toFixed(2)} MB`
      : `${(result.bytesWritten / 1024).toFixed(2)} KB`;
    return {
      content: [{
        type: 'text',
        text: `✅ Successfully wrote ${sizeStr} to ${filePath}\nMode: ${mode || 'rewrite'} | ${result.bytesWritten.toLocaleString()} bytes`,
      }],
    };
  } catch (error) {
    return errResponse('writing file', error);
  }
}

async function handleEdit(args: any): Promise<MCPResponse> {
  try {
    const { path: filePath, oldText, newText, count, dryRun } = args;
    const result = await editFile(filePath, { oldText, newText, count, dryRun });
    if (result.dryRun) {
      const lines: string[] = [
        `🔍 Dry run: ${filePath}`,
        `Replacements: ${result.replacements} | ${result.originalSize} → ${result.newSize} bytes (no write)`,
      ];
      if (result.preview && result.preview.excerpts.length > 0) {
        lines.push('', 'Preview (up to 3 excerpts):');
        result.preview.excerpts.forEach((ex, i) => {
          lines.push(`\n[${i + 1}] BEFORE:\n${ex.before}\n[${i + 1}] AFTER:\n${ex.after}`);
        });
      }
      return { content: [{ type: 'text', text: lines.join('\n') }] };
    }
    return {
      content: [{
        type: 'text',
        text: `✅ Edit successful: ${filePath}\nReplacements: ${result.replacements} | ${result.originalSize} → ${result.newSize} bytes`,
      }],
    };
  } catch (error) {
    return errResponse('editing file', error);
  }
}

async function handleList(args: any): Promise<MCPResponse> {
  try {
    const { path: dirPath, depth, pattern, sortBy } = args;
    const entries = await listDirectory(dirPath, { depth, pattern, sortBy });
    const output = entries.map((entry) => {
      const type = entry.type === 'directory' ? '[DIR]' : '[FILE]';
      const size = entry.size ? ` (${(entry.size / 1024).toFixed(2)} KB)` : '';
      return `${type} ${entry.path}${size}`;
    }).join('\n');
    return { content: [{ type: 'text', text: `Directory: ${dirPath}\nTotal: ${entries.length}\n\n${output}` }] };
  } catch (error) {
    return errResponse('listing directory', error);
  }
}

async function handleInfo(args: any): Promise<MCPResponse> {
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
    return { content: [{ type: 'text', text: info.join('\n') }] };
  } catch (error) {
    return errResponse('getting file info', error);
  }
}

async function handleDelete(args: any): Promise<MCPResponse> {
  try {
    const { path: filePath, recursive } = args;
    if (recursive) {
      await fs.rm(filePath, { recursive: true, force: true });
    } else {
      await fs.unlink(filePath);
    }
    return { content: [{ type: 'text', text: `✅ Deleted: ${filePath}` }] };
  } catch (error) {
    return errResponse('deleting', error);
  }
}

async function handleMove(args: any): Promise<MCPResponse> {
  try {
    const { source, destination } = args;
    await fs.rename(source, destination);
    return { content: [{ type: 'text', text: `✅ Moved: ${source} → ${destination}` }] };
  } catch (error) {
    return errResponse('moving file', error);
  }
}

async function handleSearch(args: any): Promise<MCPResponse> {
  try {
    const { path: searchPath, pattern, searchType = 'smart', filePattern, maxResults, contextLines, caseSensitive } = args;
    const results = await search(searchPath, { pattern, searchType, filePattern, maxResults, contextLines, caseSensitive });
    if (results.length === 0) {
      return { content: [{ type: 'text', text: `No results found for "${pattern}" in ${searchPath}` }] };
    }
    const output: string[] = [`Search results for "${pattern}" in ${searchPath}`, `Found ${results.length} matches:\n`];
    for (const result of results) {
      if (result.type === 'file') {
        output.push(`[FILE] ${result.path}`);
      } else if (result.type === 'content' && result.matches) {
        output.push(`\n[FILE] ${result.path}`);
        for (const match of result.matches.slice(0, 3)) {
          output.push(`  Line ${match.line}: ${match.text.trim()}`);
        }
        if (result.matches.length > 3) output.push(`  ... and ${result.matches.length - 3} more matches`);
      }
    }
    return { content: [{ type: 'text', text: output.join('\n') }] };
  } catch (error) {
    return errResponse('searching', error);
  }
}

async function handleExec(args: any): Promise<MCPResponse> {
  try {
    const { command, cwd, timeout } = args;
    const result = await executeCommand(command, { cwd, timeout });
    return {
      content: [{
        type: 'text',
        text: `Command: ${command}\nExit Code: ${result.exitCode}\nDuration: ${result.duration}ms\n\n${result.stdout || result.stderr}`,
      }],
    };
  } catch (error) {
    return errResponse('executing command', error);
  }
}

async function handleBatch(args: any): Promise<MCPResponse> {
  try {
    const result = await executeBatchOperations(args);
    if (!result.success) {
      return {
        content: [{
          type: 'text',
          text: `❌ Batch failed:\n${result.errors.join('\n')}\n\nPartial: ${JSON.stringify(result.results, null, 2)}`,
        }],
        isError: true,
      };
    }
    const output: string[] = ['✅ Batch operation completed successfully', `Operations: ${result.results.length}`, '\nResults:'];
    result.results.forEach((r, i) => {
      output.push(`\n${i + 1}. ${r.op} - ${r.path || r.from || 'N/A'}`);
      if (r.content) output.push(`   Content length: ${r.content.length} bytes`);
      if (r.replacements !== undefined) output.push(`   Replacements: ${r.replacements}`);
      if (r.size !== undefined) output.push(`   Size: ${r.size} bytes`);
    });
    return { content: [{ type: 'text', text: output.join('\n') }] };
  } catch (error) {
    return errResponse('batch operation', error);
  }
}

async function handlePython(args: any): Promise<MCPResponse> {
  try {
    const { code, cwd, timeout, sessionId, restart } = args;
    if (sessionId) {
      if (restart) pythonSessionManager.killSession(sessionId);
      const result = await pythonSessionManager.execute(sessionId, code, timeout);
      return { content: [{ type: 'text', text: `Python Session '${sessionId}':\n\n${result.stdout || result.stderr}` }] };
    }
    const result = await executePython(code, { cwd, timeout });
    return {
      content: [{
        type: 'text',
        text: `Python executed:\nExit Code: ${result.exitCode}\nDuration: ${result.duration}ms\n\n${result.stdout || result.stderr}`,
      }],
    };
  } catch (error) {
    return errResponse('executing Python', error);
  }
}

// ── Start server ──────────────────────────────────────────────────────────────

async function main() {
  console.error('Enhanced Filesystem MCP Server v0.11.0 starting...');
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
