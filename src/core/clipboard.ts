/**
 * Clipboard Tool - System clipboard access
 * Read from and write to Windows clipboard
 */

import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

export interface ClipboardResult {
  success: boolean;
  content?: string;
  type?: 'text' | 'image' | 'files';
  message?: string;
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<ClipboardResult> {
  // Use PowerShell to set clipboard
  // Escape for PowerShell - handle quotes and special chars
  const escaped = text
    .replace(/`/g, '``')
    .replace(/\$/g, '`$')
    .replace(/"/g, '`"');
  
  const cmd = `powershell -Command "Set-Clipboard -Value \\"${escaped}\\""`;
  
  try {
    await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 });
    return {
      success: true,
      message: `Copied ${text.length} characters to clipboard`
    };
  } catch (error) {
    // Try alternative method for complex text
    return await copyToClipboardViaStdin(text);
  }
}

/**
 * Copy via stdin pipe (handles complex text better)
 */
async function copyToClipboardViaStdin(text: string): Promise<ClipboardResult> {
  return new Promise((resolve) => {
    const proc = require('child_process').spawn('powershell', [
      '-Command',
      '$input | Set-Clipboard'
    ], { stdio: ['pipe', 'pipe', 'pipe'] });
    
    proc.stdin.write(text);
    proc.stdin.end();
    
    proc.on('close', (code: number) => {
      if (code === 0) {
        resolve({
          success: true,
          message: `Copied ${text.length} characters to clipboard`
        });
      } else {
        resolve({
          success: false,
          message: `Failed to copy to clipboard (exit code ${code})`
        });
      }
    });
    
    proc.on('error', (err: Error) => {
      resolve({
        success: false,
        message: `Clipboard error: ${err.message}`
      });
    });
  });
}

/**
 * Read text from clipboard
 */
export async function readFromClipboard(): Promise<ClipboardResult> {
  const cmd = `powershell -Command "Get-Clipboard"`;
  
  try {
    const { stdout } = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 });
    return {
      success: true,
      content: stdout,
      type: 'text'
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to read clipboard: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Get clipboard content type
 */
export async function getClipboardType(): Promise<ClipboardResult> {
  const cmd = `powershell -Command "
    $data = Get-Clipboard -Format Text -ErrorAction SilentlyContinue
    if ($data) { 'text'; exit }
    
    $data = Get-Clipboard -Format Image -ErrorAction SilentlyContinue
    if ($data) { 'image'; exit }
    
    $data = Get-Clipboard -Format FileDropList -ErrorAction SilentlyContinue
    if ($data) { 'files'; exit }
    
    'empty'
  "`;
  
  try {
    const { stdout } = await execAsync(cmd);
    const type = stdout.trim() as 'text' | 'image' | 'files' | 'empty';
    return {
      success: true,
      type: type === 'empty' ? undefined : type,
      message: type === 'empty' ? 'Clipboard is empty' : `Clipboard contains: ${type}`
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to check clipboard: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Clear clipboard
 */
export async function clearClipboard(): Promise<ClipboardResult> {
  const cmd = `powershell -Command "Set-Clipboard -Value $null"`;
  
  try {
    await execAsync(cmd);
    return {
      success: true,
      message: 'Clipboard cleared'
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to clear clipboard: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Copy file path(s) to clipboard (as file drop list)
 */
export async function copyFilesToClipboard(filePaths: string[]): Promise<ClipboardResult> {
  const pathsArray = filePaths.map(p => `"${p}"`).join(',');
  const cmd = `powershell -Command "Set-Clipboard -Path @(${pathsArray})"`;
  
  try {
    await execAsync(cmd);
    return {
      success: true,
      message: `Copied ${filePaths.length} file path(s) to clipboard`
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to copy files: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Get files from clipboard
 */
export async function getFilesFromClipboard(): Promise<{ success: boolean; files?: string[]; message?: string }> {
  const cmd = `powershell -Command "Get-Clipboard -Format FileDropList | ForEach-Object { $_.FullName }"`;
  
  try {
    const { stdout } = await execAsync(cmd);
    const files = stdout.trim().split('\n').filter(f => f.trim());
    return {
      success: true,
      files
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to get files: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export async function executeClipboardOperation(args: any): Promise<string> {
  const { operation } = args;

  switch (operation) {
    case 'copy': {
      if (!args.text) {
        throw new Error('text is required for copy operation');
      }
      const result = await copyToClipboard(args.text);
      if (result.success) {
        return `✅ ${result.message}`;
      } else {
        throw new Error(result.message);
      }
    }
    
    case 'paste':
    case 'read': {
      const result = await readFromClipboard();
      if (result.success) {
        return `📋 Clipboard contents:\n\n${result.content}`;
      } else {
        throw new Error(result.message);
      }
    }
    
    case 'type': {
      const result = await getClipboardType();
      return result.message || 'Unknown clipboard state';
    }
    
    case 'clear': {
      const result = await clearClipboard();
      if (result.success) {
        return `🗑️ ${result.message}`;
      } else {
        throw new Error(result.message);
      }
    }
    
    case 'copy-files': {
      if (!args.files || !Array.isArray(args.files)) {
        throw new Error('files (array) is required for copy-files operation');
      }
      const result = await copyFilesToClipboard(args.files);
      if (result.success) {
        return `✅ ${result.message}`;
      } else {
        throw new Error(result.message);
      }
    }
    
    case 'get-files': {
      const result = await getFilesFromClipboard();
      if (result.success && result.files) {
        if (result.files.length === 0) {
          return '📋 No files in clipboard';
        }
        return `📋 Files in clipboard:\n${result.files.join('\n')}`;
      } else {
        throw new Error(result.message);
      }
    }
    
    default:
      throw new Error(`Unknown clipboard operation: ${operation}`);
  }
}
