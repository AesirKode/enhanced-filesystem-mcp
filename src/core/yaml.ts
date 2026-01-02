/**
 * YAML/TOML Tool - Config file operations
 * Read, write, edit, validate, convert between formats
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import * as YAML from 'yaml';
import * as TOML from '@iarna/toml';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

// ============================================================================
// Types
// ============================================================================

type ConfigFormat = 'yaml' | 'toml' | 'json';

interface ParseResult {
  format: ConfigFormat;
  data: any;
  path: string;
}

// ============================================================================
// Format Detection & Parsing
// ============================================================================

function detectFormat(filePath: string): ConfigFormat {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.yaml':
    case '.yml':
      return 'yaml';
    case '.toml':
      return 'toml';
    case '.json':
      return 'json';
    default:
      return 'yaml'; // Default to YAML
  }
}

async function parseFile(filePath: string, format?: ConfigFormat): Promise<ParseResult> {
  const content = await readFile(filePath, 'utf-8');
  const detectedFormat = format || detectFormat(filePath);
  
  let data: any;
  switch (detectedFormat) {
    case 'yaml':
      data = YAML.parse(content);
      break;
    case 'toml':
      data = TOML.parse(content);
      break;
    case 'json':
      data = JSON.parse(content);
      break;
  }
  
  return { format: detectedFormat, data, path: filePath };
}

function serialize(data: any, format: ConfigFormat, indent: number = 2): string {
  switch (format) {
    case 'yaml':
      return YAML.stringify(data, { indent });
    case 'toml':
      return TOML.stringify(data as TOML.JsonMap);
    case 'json':
      return JSON.stringify(data, null, indent);
  }
}

// ============================================================================
// Path Operations (dot-notation access)
// ============================================================================

function getByPath(obj: any, pathStr: string): any {
  if (!pathStr || pathStr === '$' || pathStr === '.') return obj;
  
  const parts = pathStr.replace(/^\$\.?/, '').split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    
    // Handle array indexing: key[0]
    const arrayMatch = part.match(/^(.+?)\[(\d+)\]$/);
    if (arrayMatch) {
      current = current[arrayMatch[1]];
      if (Array.isArray(current)) {
        current = current[parseInt(arrayMatch[2], 10)];
      } else {
        return undefined;
      }
    } else {
      current = current[part];
    }
  }
  
  return current;
}

function setByPath(obj: any, pathStr: string, value: any): void {
  if (!pathStr || pathStr === '$' || pathStr === '.') {
    throw new Error('Cannot set root value');
  }
  
  const parts = pathStr.replace(/^\$\.?/, '').split('.');
  let current = obj;
  
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    const arrayMatch = part.match(/^(.+?)\[(\d+)\]$/);
    
    if (arrayMatch) {
      const key = arrayMatch[1];
      const index = parseInt(arrayMatch[2], 10);
      if (!current[key]) current[key] = [];
      if (!current[key][index]) current[key][index] = {};
      current = current[key][index];
    } else {
      if (!current[part]) current[part] = {};
      current = current[part];
    }
  }
  
  const lastPart = parts[parts.length - 1];
  const lastArrayMatch = lastPart.match(/^(.+?)\[(\d+)\]$/);
  
  if (lastArrayMatch) {
    const key = lastArrayMatch[1];
    const index = parseInt(lastArrayMatch[2], 10);
    if (!current[key]) current[key] = [];
    current[key][index] = value;
  } else {
    current[lastPart] = value;
  }
}

function deleteByPath(obj: any, pathStr: string): boolean {
  if (!pathStr || pathStr === '$' || pathStr === '.') {
    throw new Error('Cannot delete root');
  }
  
  const parts = pathStr.replace(/^\$\.?/, '').split('.');
  let current = obj;
  
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (current[part] === undefined) return false;
    current = current[part];
  }
  
  const lastPart = parts[parts.length - 1];
  if (current[lastPart] === undefined) return false;
  
  delete current[lastPart];
  return true;
}

// ============================================================================
// Deep Merge
// ============================================================================

function deepMerge(target: any, source: any): any {
  const result = { ...target };
  
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])) {
        result[key] = deepMerge(result[key], source[key]);
      } else {
        result[key] = { ...source[key] };
      }
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}

// ============================================================================
// Diff
// ============================================================================

interface DiffResult {
  added: string[];
  removed: string[];
  changed: { path: string; old: any; new: any }[];
}

function flattenObject(obj: any, prefix: string = ''): Record<string, any> {
  const result: Record<string, any> = {};
  
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, fullKey));
    } else {
      result[fullKey] = value;
    }
  }
  
  return result;
}

function diffObjects(obj1: any, obj2: any): DiffResult {
  const flat1 = flattenObject(obj1);
  const flat2 = flattenObject(obj2);
  
  const keys1 = new Set(Object.keys(flat1));
  const keys2 = new Set(Object.keys(flat2));
  
  const added: string[] = [];
  const removed: string[] = [];
  const changed: { path: string; old: any; new: any }[] = [];
  
  // Find removed keys
  for (const key of keys1) {
    if (!keys2.has(key)) {
      removed.push(key);
    }
  }
  
  // Find added and changed keys
  for (const key of keys2) {
    if (!keys1.has(key)) {
      added.push(key);
    } else if (JSON.stringify(flat1[key]) !== JSON.stringify(flat2[key])) {
      changed.push({ path: key, old: flat1[key], new: flat2[key] });
    }
  }
  
  return { added, removed, changed };
}

// ============================================================================
// Main Execute Function
// ============================================================================

export async function executeYamlOperation(args: any): Promise<string> {
  const { operation } = args;
  
  switch (operation) {
    case 'get': {
      if (!args.path) throw new Error('path is required');
      
      const result = await parseFile(args.path, args.format);
      const value = args.query ? getByPath(result.data, args.query) : result.data;
      
      if (value === undefined) {
        return `Key not found: ${args.query}`;
      }
      
      // Format output
      if (typeof value === 'object') {
        return YAML.stringify(value, { indent: 2 });
      }
      return String(value);
    }
    
    case 'set': {
      if (!args.path) throw new Error('path is required');
      if (!args.query) throw new Error('query (key path) is required');
      if (args.value === undefined) throw new Error('value is required');
      
      const result = await parseFile(args.path, args.format);
      setByPath(result.data, args.query, args.value);
      
      const outputPath = args.output || args.path;
      const outputFormat = args.outputFormat || detectFormat(outputPath);
      const content = serialize(result.data, outputFormat, args.indent || 2);
      
      await writeFile(outputPath, content, 'utf-8');
      return `Set ${args.query} = ${JSON.stringify(args.value)} in ${outputPath}`;
    }
    
    case 'delete': {
      if (!args.path) throw new Error('path is required');
      if (!args.query) throw new Error('query (key path) is required');
      
      const result = await parseFile(args.path, args.format);
      const deleted = deleteByPath(result.data, args.query);
      
      if (!deleted) {
        return `Key not found: ${args.query}`;
      }
      
      const outputPath = args.output || args.path;
      const outputFormat = args.outputFormat || detectFormat(outputPath);
      const content = serialize(result.data, outputFormat, args.indent || 2);
      
      await writeFile(outputPath, content, 'utf-8');
      return `Deleted ${args.query} from ${outputPath}`;
    }
    
    case 'validate': {
      if (!args.path) throw new Error('path is required');
      
      try {
        const result = await parseFile(args.path, args.format);
        const keyCount = Object.keys(flattenObject(result.data)).length;
        return `✅ Valid ${result.format.toUpperCase()} (${keyCount} keys)`;
      } catch (e) {
        return `❌ Invalid: ${(e as Error).message}`;
      }
    }
    
    case 'convert': {
      if (!args.path) throw new Error('path is required');
      if (!args.outputFormat) throw new Error('outputFormat is required (yaml, toml, or json)');
      
      const result = await parseFile(args.path, args.format);
      const content = serialize(result.data, args.outputFormat as ConfigFormat, args.indent || 2);
      
      if (args.output) {
        await writeFile(args.output, content, 'utf-8');
        return `Converted ${result.format.toUpperCase()} → ${args.outputFormat.toUpperCase()}\nSaved to: ${args.output}`;
      }
      
      return content;
    }
    
    case 'merge': {
      if (!args.path) throw new Error('path is required');
      if (!args.mergeWith && !args.mergeWithFile) {
        throw new Error('mergeWith or mergeWithFile is required');
      }
      
      const base = await parseFile(args.path, args.format);
      
      let mergeData: any;
      if (args.mergeWithFile) {
        const mergeResult = await parseFile(args.mergeWithFile);
        mergeData = mergeResult.data;
      } else {
        mergeData = args.mergeWith;
      }
      
      const strategy = args.strategy || 'deep';
      let merged: any;
      
      switch (strategy) {
        case 'deep':
          merged = deepMerge(base.data, mergeData);
          break;
        case 'shallow':
          merged = { ...base.data, ...mergeData };
          break;
        case 'replace':
          merged = mergeData;
          break;
        default:
          throw new Error(`Unknown merge strategy: ${strategy}`);
      }
      
      const outputPath = args.output || args.path;
      const outputFormat = args.outputFormat || detectFormat(outputPath);
      const content = serialize(merged, outputFormat, args.indent || 2);
      
      await writeFile(outputPath, content, 'utf-8');
      return `Merged (${strategy}) → ${outputPath}`;
    }
    
    case 'diff': {
      if (!args.path) throw new Error('path is required');
      if (!args.compareTo) throw new Error('compareTo is required');
      
      const file1 = await parseFile(args.path, args.format);
      const file2 = await parseFile(args.compareTo);
      
      const diff = diffObjects(file1.data, file2.data);
      const lines: string[] = [];
      
      lines.push(`Comparing: ${args.path} ↔ ${args.compareTo}`);
      lines.push('');
      
      if (diff.added.length === 0 && diff.removed.length === 0 && diff.changed.length === 0) {
        lines.push('Files are identical.');
      } else {
        if (diff.removed.length > 0) {
          lines.push(`Removed (${diff.removed.length}):`);
          for (const key of diff.removed.slice(0, 20)) {
            lines.push(`  - ${key}`);
          }
          if (diff.removed.length > 20) lines.push(`  ... and ${diff.removed.length - 20} more`);
          lines.push('');
        }
        
        if (diff.added.length > 0) {
          lines.push(`Added (${diff.added.length}):`);
          for (const key of diff.added.slice(0, 20)) {
            lines.push(`  + ${key}`);
          }
          if (diff.added.length > 20) lines.push(`  ... and ${diff.added.length - 20} more`);
          lines.push('');
        }
        
        if (diff.changed.length > 0) {
          lines.push(`Changed (${diff.changed.length}):`);
          for (const change of diff.changed.slice(0, 20)) {
            lines.push(`  ~ ${change.path}`);
            lines.push(`    old: ${JSON.stringify(change.old)}`);
            lines.push(`    new: ${JSON.stringify(change.new)}`);
          }
          if (diff.changed.length > 20) lines.push(`  ... and ${diff.changed.length - 20} more`);
        }
      }
      
      return lines.join('\n');
    }
    
    case 'keys': {
      if (!args.path) throw new Error('path is required');
      
      const result = await parseFile(args.path, args.format);
      const keys = Object.keys(flattenObject(result.data));
      
      const lines: string[] = [];
      lines.push(`Keys in ${args.path} (${keys.length} total):`);
      lines.push('');
      
      const limit = args.limit || 50;
      for (const key of keys.slice(0, limit)) {
        lines.push(`  ${key}`);
      }
      if (keys.length > limit) {
        lines.push(`  ... and ${keys.length - limit} more`);
      }
      
      return lines.join('\n');
    }
    
    case 'format': {
      if (!args.path) throw new Error('path is required');
      
      const result = await parseFile(args.path, args.format);
      const content = serialize(result.data, result.format, args.indent || 2);
      
      const outputPath = args.output || args.path;
      await writeFile(outputPath, content, 'utf-8');
      
      return `Formatted ${result.format.toUpperCase()} → ${outputPath}`;
    }
    
    default:
      throw new Error(`Unknown yaml operation: ${operation}. Available: get, set, delete, validate, convert, merge, diff, keys, format`);
  }
}
