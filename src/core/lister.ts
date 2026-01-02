import { promises as fs } from 'fs';
import * as path from 'path';

export interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: Date;
}

export interface ListOptions {
  depth?: number;
  pattern?: string;
  sortBy?: 'name' | 'size' | 'date';
  includeHidden?: boolean;
}

export async function listDirectory(
  dirPath: string,
  options: ListOptions = {}
): Promise<FileEntry[]> {
  const { depth = 1, pattern, sortBy = 'name', includeHidden = false } = options;

  const entries: FileEntry[] = [];
  const errors: string[] = [];

  async function traverse(currentPath: string, currentDepth: number) {
    if (currentDepth > depth) return;

    try {
      const items = await fs.readdir(currentPath);

      for (const item of items) {
        try {
          // Skip hidden files unless requested
          if (!includeHidden && item.startsWith('.')) continue;

          const itemPath = path.join(currentPath, item);
          const stats = await fs.stat(itemPath);

          // Apply pattern filter
          if (pattern && !matchPattern(item, pattern)) continue;

          const entry: FileEntry = {
            name: item,
            path: itemPath,
            type: stats.isDirectory() ? 'directory' : 'file',
            size: stats.isFile() ? stats.size : undefined,
            modified: stats.mtime,
          };

          entries.push(entry);

          // Recurse into directories
          if (stats.isDirectory() && currentDepth < depth) {
            await traverse(itemPath, currentDepth + 1);
          }
        } catch (itemError) {
          errors.push(`Error processing ${item}: ${itemError}`);
        }
      }
    } catch (error) {
      // Directory read error
      errors.push(`Error reading ${currentPath}: ${error}`);
      throw new Error(`Failed to read directory: ${error}. Errors: ${errors.join(', ')}`);
    }
  }

  await traverse(dirPath, 0);

  // Sort entries
  entries.sort((a, b) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    } else if (sortBy === 'size') {
      return (a.size || 0) - (b.size || 0);
    } else if (sortBy === 'date') {
      return (a.modified?.getTime() || 0) - (b.modified?.getTime() || 0);
    }
    return 0;
  });

  return entries;
}

function matchPattern(name: string, pattern: string): boolean {
  // Simple pattern matching - supports * wildcard
  const regex = new RegExp(
    '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$',
    'i'
  );
  return regex.test(name);
}
