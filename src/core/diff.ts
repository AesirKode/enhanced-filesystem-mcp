/**
 * Diff Tool - Compare files and directories
 * Show differences, generate patches, track changes
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// ============================================================================
// Types
// ============================================================================

interface LineDiff {
  type: 'add' | 'remove' | 'same';
  lineNum1?: number;
  lineNum2?: number;
  content: string;
}

interface FileDiff {
  file1: string;
  file2: string;
  identical: boolean;
  additions: number;
  deletions: number;
  changes: LineDiff[];
}

interface DirDiff {
  dir1: string;
  dir2: string;
  onlyInDir1: string[];
  onlyInDir2: string[];
  different: string[];
  identical: string[];
}

// ============================================================================
// Line-by-Line Diff (Myers algorithm simplified)
// ============================================================================

function diffLines(content1: string, content2: string, contextLines: number = 3): LineDiff[] {
  const lines1 = content1.split('\n');
  const lines2 = content2.split('\n');
  
  const result: LineDiff[] = [];
  
  // Simple diff: mark lines as add/remove/same
  let i = 0, j = 0;
  
  while (i < lines1.length || j < lines2.length) {
    if (i >= lines1.length) {
      // Remaining lines in file2 are additions
      result.push({ type: 'add', lineNum2: j + 1, content: lines2[j] });
      j++;
    } else if (j >= lines2.length) {
      // Remaining lines in file1 are deletions
      result.push({ type: 'remove', lineNum1: i + 1, content: lines1[i] });
      i++;
    } else if (lines1[i] === lines2[j]) {
      // Lines match
      result.push({ type: 'same', lineNum1: i + 1, lineNum2: j + 1, content: lines1[i] });
      i++;
      j++;
    } else {
      // Look ahead to find next match
      let foundMatch = false;
      
      // Check if line from file1 exists later in file2
      for (let k = j + 1; k < Math.min(j + 10, lines2.length); k++) {
        if (lines1[i] === lines2[k]) {
          // Lines j to k-1 in file2 are additions
          for (let m = j; m < k; m++) {
            result.push({ type: 'add', lineNum2: m + 1, content: lines2[m] });
          }
          j = k;
          foundMatch = true;
          break;
        }
      }
      
      if (!foundMatch) {
        // Check if line from file2 exists later in file1
        for (let k = i + 1; k < Math.min(i + 10, lines1.length); k++) {
          if (lines2[j] === lines1[k]) {
            // Lines i to k-1 in file1 are deletions
            for (let m = i; m < k; m++) {
              result.push({ type: 'remove', lineNum1: m + 1, content: lines1[m] });
            }
            i = k;
            foundMatch = true;
            break;
          }
        }
      }
      
      if (!foundMatch) {
        // No nearby match found, treat as replace
        result.push({ type: 'remove', lineNum1: i + 1, content: lines1[i] });
        result.push({ type: 'add', lineNum2: j + 1, content: lines2[j] });
        i++;
        j++;
      }
    }
  }
  
  // Filter to show only changes with context
  if (contextLines >= 0) {
    const filtered: LineDiff[] = [];
    const changeIndices = new Set<number>();
    
    // Find all change indices
    for (let idx = 0; idx < result.length; idx++) {
      if (result[idx].type !== 'same') {
        changeIndices.add(idx);
      }
    }
    
    // Include context around changes
    for (let idx = 0; idx < result.length; idx++) {
      let include = changeIndices.has(idx);
      
      if (!include) {
        // Check if within context of a change
        for (let c = idx - contextLines; c <= idx + contextLines; c++) {
          if (changeIndices.has(c)) {
            include = true;
            break;
          }
        }
      }
      
      if (include) {
        filtered.push(result[idx]);
      }
    }
    
    return filtered;
  }
  
  return result;
}

// ============================================================================
// File Comparison
// ============================================================================

async function compareFiles(file1: string, file2: string, contextLines: number = 3): Promise<FileDiff> {
  const content1 = await readFile(file1, 'utf-8');
  const content2 = await readFile(file2, 'utf-8');
  
  if (content1 === content2) {
    return {
      file1,
      file2,
      identical: true,
      additions: 0,
      deletions: 0,
      changes: []
    };
  }
  
  const changes = diffLines(content1, content2, contextLines);
  const additions = changes.filter(c => c.type === 'add').length;
  const deletions = changes.filter(c => c.type === 'remove').length;
  
  return {
    file1,
    file2,
    identical: false,
    additions,
    deletions,
    changes
  };
}

// ============================================================================
// Directory Comparison
// ============================================================================

async function listFilesRecursive(dir: string, base: string = ''): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const relativePath = base ? path.join(base, entry.name) : entry.name;
    
    if (entry.isDirectory()) {
      const subFiles = await listFilesRecursive(path.join(dir, entry.name), relativePath);
      files.push(...subFiles);
    } else {
      files.push(relativePath);
    }
  }
  
  return files;
}

async function compareDirectories(dir1: string, dir2: string): Promise<DirDiff> {
  const files1 = new Set(await listFilesRecursive(dir1));
  const files2 = new Set(await listFilesRecursive(dir2));
  
  const onlyInDir1: string[] = [];
  const onlyInDir2: string[] = [];
  const different: string[] = [];
  const identical: string[] = [];
  
  // Files only in dir1
  for (const file of files1) {
    if (!files2.has(file)) {
      onlyInDir1.push(file);
    }
  }
  
  // Files only in dir2
  for (const file of files2) {
    if (!files1.has(file)) {
      onlyInDir2.push(file);
    }
  }
  
  // Compare common files
  for (const file of files1) {
    if (files2.has(file)) {
      const path1 = path.join(dir1, file);
      const path2 = path.join(dir2, file);
      
      try {
        const content1 = await readFile(path1);
        const content2 = await readFile(path2);
        
        if (content1.equals(content2)) {
          identical.push(file);
        } else {
          different.push(file);
        }
      } catch {
        different.push(file);
      }
    }
  }
  
  return {
    dir1,
    dir2,
    onlyInDir1: onlyInDir1.sort(),
    onlyInDir2: onlyInDir2.sort(),
    different: different.sort(),
    identical: identical.sort()
  };
}

// ============================================================================
// Unified Diff Format
// ============================================================================

function generateUnifiedDiff(diff: FileDiff): string {
  const lines: string[] = [];
  
  lines.push(`--- ${diff.file1}`);
  lines.push(`+++ ${diff.file2}`);
  
  let currentHunk: LineDiff[] = [];
  let hunkStart1 = 0;
  let hunkStart2 = 0;
  
  for (const change of diff.changes) {
    if (change.type === 'same') {
      if (currentHunk.length > 0 && currentHunk[currentHunk.length - 1].type === 'same') {
        // Continue same block
        currentHunk.push(change);
      } else if (currentHunk.length > 0) {
        // End of change block, add context
        currentHunk.push(change);
      } else {
        // Start new hunk
        currentHunk.push(change);
        hunkStart1 = change.lineNum1 || 1;
        hunkStart2 = change.lineNum2 || 1;
      }
    } else {
      if (currentHunk.length === 0) {
        hunkStart1 = change.lineNum1 || 1;
        hunkStart2 = change.lineNum2 || 1;
      }
      currentHunk.push(change);
    }
  }
  
  // Output hunk
  if (currentHunk.length > 0) {
    const removes = currentHunk.filter(c => c.type !== 'add').length;
    const adds = currentHunk.filter(c => c.type !== 'remove').length;
    
    lines.push(`@@ -${hunkStart1},${removes} +${hunkStart2},${adds} @@`);
    
    for (const change of currentHunk) {
      const prefix = change.type === 'add' ? '+' : change.type === 'remove' ? '-' : ' ';
      lines.push(`${prefix}${change.content}`);
    }
  }
  
  return lines.join('\n');
}

// ============================================================================
// Binary File Detection
// ============================================================================

async function isBinaryFile(filePath: string): Promise<boolean> {
  const buffer = Buffer.alloc(8000);
  const fd = fs.openSync(filePath, 'r');
  const bytesRead = fs.readSync(fd, buffer, 0, 8000, 0);
  fs.closeSync(fd);
  
  // Check for null bytes (common in binary files)
  for (let i = 0; i < bytesRead; i++) {
    if (buffer[i] === 0) {
      return true;
    }
  }
  
  return false;
}

// ============================================================================
// Main Execute Function
// ============================================================================

export async function executeDiffOperation(args: any): Promise<string> {
  const { operation } = args;
  
  switch (operation) {
    case 'files': {
      if (!args.path1 || !args.path2) {
        throw new Error('path1 and path2 are required');
      }
      
      // Check if binary
      const [isBinary1, isBinary2] = await Promise.all([
        isBinaryFile(args.path1),
        isBinaryFile(args.path2)
      ]);
      
      if (isBinary1 || isBinary2) {
        const stat1 = await stat(args.path1);
        const stat2 = await stat(args.path2);
        
        const content1 = await readFile(args.path1);
        const content2 = await readFile(args.path2);
        const identical = content1.equals(content2);
        
        return [
          'Binary files comparison:',
          `  ${args.path1}: ${stat1.size} bytes`,
          `  ${args.path2}: ${stat2.size} bytes`,
          `  Status: ${identical ? '✅ Identical' : '❌ Different'}`
        ].join('\n');
      }
      
      const diff = await compareFiles(args.path1, args.path2, args.context ?? 3);
      
      if (diff.identical) {
        return `✅ Files are identical`;
      }
      
      if (args.unified) {
        return generateUnifiedDiff(diff);
      }
      
      const lines: string[] = [];
      lines.push(`Comparing: ${diff.file1} ↔ ${diff.file2}`);
      lines.push(`Changes: +${diff.additions} -${diff.deletions}`);
      lines.push('');
      
      for (const change of diff.changes.slice(0, args.limit || 100)) {
        if (change.type === 'add') {
          lines.push(`+ ${change.lineNum2}: ${change.content}`);
        } else if (change.type === 'remove') {
          lines.push(`- ${change.lineNum1}: ${change.content}`);
        } else {
          lines.push(`  ${change.lineNum1}: ${change.content}`);
        }
      }
      
      if (diff.changes.length > (args.limit || 100)) {
        lines.push(`... and ${diff.changes.length - (args.limit || 100)} more changes`);
      }
      
      return lines.join('\n');
    }
    
    case 'dirs': {
      if (!args.path1 || !args.path2) {
        throw new Error('path1 and path2 are required');
      }
      
      const diff = await compareDirectories(args.path1, args.path2);
      const lines: string[] = [];
      
      lines.push(`Comparing directories:`);
      lines.push(`  ${diff.dir1}`);
      lines.push(`  ${diff.dir2}`);
      lines.push('');
      
      const totalChanges = diff.onlyInDir1.length + diff.onlyInDir2.length + diff.different.length;
      
      if (totalChanges === 0) {
        lines.push(`✅ Directories are identical (${diff.identical.length} files)`);
        return lines.join('\n');
      }
      
      lines.push(`Summary: ${diff.identical.length} identical, ${diff.different.length} different, ${diff.onlyInDir1.length} only in first, ${diff.onlyInDir2.length} only in second`);
      lines.push('');
      
      if (diff.onlyInDir1.length > 0) {
        lines.push(`Only in ${path.basename(diff.dir1)}/ (${diff.onlyInDir1.length}):`);
        for (const file of diff.onlyInDir1.slice(0, 20)) {
          lines.push(`  - ${file}`);
        }
        if (diff.onlyInDir1.length > 20) {
          lines.push(`  ... and ${diff.onlyInDir1.length - 20} more`);
        }
        lines.push('');
      }
      
      if (diff.onlyInDir2.length > 0) {
        lines.push(`Only in ${path.basename(diff.dir2)}/ (${diff.onlyInDir2.length}):`);
        for (const file of diff.onlyInDir2.slice(0, 20)) {
          lines.push(`  + ${file}`);
        }
        if (diff.onlyInDir2.length > 20) {
          lines.push(`  ... and ${diff.onlyInDir2.length - 20} more`);
        }
        lines.push('');
      }
      
      if (diff.different.length > 0) {
        lines.push(`Different content (${diff.different.length}):`);
        for (const file of diff.different.slice(0, 20)) {
          lines.push(`  ~ ${file}`);
        }
        if (diff.different.length > 20) {
          lines.push(`  ... and ${diff.different.length - 20} more`);
        }
      }
      
      return lines.join('\n');
    }
    
    case 'stat': {
      if (!args.path1 || !args.path2) {
        throw new Error('path1 and path2 are required');
      }
      
      const stat1 = await stat(args.path1);
      const stat2 = await stat(args.path2);
      
      const lines: string[] = [];
      lines.push('File Statistics:');
      lines.push('');
      lines.push(`${args.path1}:`);
      lines.push(`  Size: ${stat1.size} bytes`);
      lines.push(`  Modified: ${stat1.mtime.toISOString()}`);
      lines.push('');
      lines.push(`${args.path2}:`);
      lines.push(`  Size: ${stat2.size} bytes`);
      lines.push(`  Modified: ${stat2.mtime.toISOString()}`);
      lines.push('');
      
      const sizeDiff = stat1.size - stat2.size;
      if (sizeDiff !== 0) {
        lines.push(`Size difference: ${sizeDiff > 0 ? '+' : ''}${sizeDiff} bytes`);
      } else {
        lines.push('Size: Identical');
      }
      
      if (stat1.mtime > stat2.mtime) {
        lines.push(`${path.basename(args.path1)} is newer`);
      } else if (stat2.mtime > stat1.mtime) {
        lines.push(`${path.basename(args.path2)} is newer`);
      } else {
        lines.push('Modified time: Identical');
      }
      
      return lines.join('\n');
    }
    
    case 'quick': {
      if (!args.path1 || !args.path2) {
        throw new Error('path1 and path2 are required');
      }
      
      const stat1 = await stat(args.path1);
      const stat2 = await stat(args.path2);
      
      // Quick check: different size = different
      if (stat1.size !== stat2.size) {
        return `❌ Different (size: ${stat1.size} vs ${stat2.size} bytes)`;
      }
      
      // Same size: compare content
      const content1 = await readFile(args.path1);
      const content2 = await readFile(args.path2);
      
      if (content1.equals(content2)) {
        return `✅ Identical (${stat1.size} bytes)`;
      }
      
      return `❌ Different (same size: ${stat1.size} bytes, content differs)`;
    }
    
    default:
      throw new Error(`Unknown diff operation: ${operation}. Available: files, dirs, stat, quick`);
  }
}
