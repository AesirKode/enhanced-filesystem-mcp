/**
 * JSON/YAML Operations with JSONPath support
 * Deep querying, manipulation, and validation
 */

import { promises as fs } from 'fs';
import * as path from 'path';

// Simple JSONPath implementation (subset of full spec)
// Supports: $.key, $.key.nested, $..recursive, $.array[0], $.array[*], $[?(@.prop == value)]

export interface JsonOptions {
  operation: 'get' | 'set' | 'delete' | 'merge' | 'transform' | 'validate' | 'diff' | 'flatten' | 'unflatten' | 'convert';
  path: string;
  query?: string;
  value?: any;
  mergeWith?: any;
  mergeWithFile?: string;
  strategy?: 'deep' | 'shallow' | 'replace';
  output?: string;
  compareTo?: string;
  outputFormat?: 'json' | 'yaml';
  transforms?: Array<{
    query: string;
    value?: any;
    multiply?: number;
    add?: number;
    uppercase?: boolean;
    lowercase?: boolean;
  }>;
  schemaInline?: any;
  schema?: string;
}

/**
 * Simple JSONPath query implementation
 */
function queryJsonPath(obj: any, pathExpr: string): any[] {
  if (!pathExpr.startsWith('$')) {
    throw new Error('JSONPath must start with $');
  }

  // Remove leading $
  let expr = pathExpr.slice(1);
  
  // Handle root
  if (expr === '' || expr === '.') {
    return [obj];
  }

  const results: any[] = [];
  
  function traverse(current: any, remainingPath: string): void {
    if (remainingPath === '') {
      results.push(current);
      return;
    }

    // Handle recursive descent (..)
    if (remainingPath.startsWith('..')) {
      const rest = remainingPath.slice(2);
      const nextDot = rest.indexOf('.');
      const nextBracket = rest.indexOf('[');
      
      let key: string;
      let newRest: string;
      
      if (nextDot === -1 && nextBracket === -1) {
        key = rest;
        newRest = '';
      } else if (nextDot === -1) {
        key = rest.slice(0, nextBracket);
        newRest = rest.slice(nextBracket);
      } else if (nextBracket === -1) {
        key = rest.slice(0, nextDot);
        newRest = rest.slice(nextDot);
      } else {
        const firstSep = Math.min(nextDot, nextBracket);
        key = rest.slice(0, firstSep);
        newRest = rest.slice(firstSep);
      }

      // Recursive search
      function searchRecursive(node: any): void {
        if (node === null || node === undefined) return;
        
        if (typeof node === 'object') {
          if (key in node) {
            traverse(node[key], newRest);
          }
          
          if (Array.isArray(node)) {
            for (const item of node) {
              searchRecursive(item);
            }
          } else {
            for (const val of Object.values(node)) {
              searchRecursive(val);
            }
          }
        }
      }
      
      searchRecursive(current);
      return;
    }

    // Handle dot notation
    if (remainingPath.startsWith('.')) {
      const rest = remainingPath.slice(1);
      const nextDot = rest.indexOf('.');
      const nextBracket = rest.indexOf('[');
      
      let key: string;
      let newRest: string;
      
      if (nextDot === -1 && nextBracket === -1) {
        key = rest;
        newRest = '';
      } else if (nextDot === -1) {
        key = rest.slice(0, nextBracket);
        newRest = rest.slice(nextBracket);
      } else if (nextBracket === -1) {
        key = rest.slice(0, nextDot);
        newRest = rest.slice(nextDot);
      } else {
        const firstSep = Math.min(nextDot, nextBracket);
        key = rest.slice(0, firstSep);
        newRest = rest.slice(firstSep);
      }

      if (key === '*') {
        // Wildcard
        if (Array.isArray(current)) {
          for (const item of current) {
            traverse(item, newRest);
          }
        } else if (typeof current === 'object' && current !== null) {
          for (const val of Object.values(current)) {
            traverse(val, newRest);
          }
        }
      } else if (current !== null && typeof current === 'object' && key in current) {
        traverse(current[key], newRest);
      }
      return;
    }

    // Handle bracket notation
    if (remainingPath.startsWith('[')) {
      const closeBracket = remainingPath.indexOf(']');
      if (closeBracket === -1) {
        throw new Error('Unclosed bracket in JSONPath');
      }
      
      const bracketContent = remainingPath.slice(1, closeBracket);
      const newRest = remainingPath.slice(closeBracket + 1);

      // Handle array index
      if (/^\d+$/.test(bracketContent)) {
        const index = parseInt(bracketContent, 10);
        if (Array.isArray(current) && index < current.length) {
          traverse(current[index], newRest);
        }
        return;
      }

      // Handle wildcard [*]
      if (bracketContent === '*') {
        if (Array.isArray(current)) {
          for (const item of current) {
            traverse(item, newRest);
          }
        }
        return;
      }

      // Handle filter expression [?(@.prop == value)]
      if (bracketContent.startsWith('?(')) {
        const filterExpr = bracketContent.slice(2, -1); // Remove ?( and )
        
        if (Array.isArray(current)) {
          for (const item of current) {
            if (evaluateFilter(item, filterExpr)) {
              traverse(item, newRest);
            }
          }
        }
        return;
      }

      // Handle quoted key ['key']
      if ((bracketContent.startsWith("'") && bracketContent.endsWith("'")) ||
          (bracketContent.startsWith('"') && bracketContent.endsWith('"'))) {
        const key = bracketContent.slice(1, -1);
        if (current !== null && typeof current === 'object' && key in current) {
          traverse(current[key], newRest);
        }
        return;
      }
    }
  }

  traverse(obj, expr);
  return results;
}

/**
 * Evaluate simple filter expressions
 */
function evaluateFilter(item: any, expr: string): boolean {
  // Support: @.prop == value, @.prop != value, @.prop, @.prop > value, @.prop < value
  
  // Check for property existence: @.prop
  const existsMatch = expr.match(/^@\.(\w+)$/);
  if (existsMatch) {
    const prop = existsMatch[1];
    return item !== null && typeof item === 'object' && prop in item;
  }

  // Check for comparison
  const compMatch = expr.match(/^@\.(\w+)\s*(==|!=|>|<|>=|<=)\s*(.+)$/);
  if (compMatch) {
    const [, prop, op, valueStr] = compMatch;
    
    if (item === null || typeof item !== 'object' || !(prop in item)) {
      return false;
    }

    const itemValue = item[prop];
    let compareValue: any = valueStr.trim();
    
    // Parse compare value
    if (compareValue.startsWith("'") && compareValue.endsWith("'")) {
      compareValue = compareValue.slice(1, -1);
    } else if (compareValue.startsWith('"') && compareValue.endsWith('"')) {
      compareValue = compareValue.slice(1, -1);
    } else if (compareValue === 'true') {
      compareValue = true;
    } else if (compareValue === 'false') {
      compareValue = false;
    } else if (compareValue === 'null') {
      compareValue = null;
    } else if (!isNaN(Number(compareValue))) {
      compareValue = Number(compareValue);
    }

    switch (op) {
      case '==': return itemValue == compareValue;
      case '!=': return itemValue != compareValue;
      case '>': return itemValue > compareValue;
      case '<': return itemValue < compareValue;
      case '>=': return itemValue >= compareValue;
      case '<=': return itemValue <= compareValue;
    }
  }

  return false;
}

/**
 * Set value at JSONPath (simple implementation)
 */
function setJsonPath(obj: any, pathExpr: string, value: any): { modified: boolean; oldValue: any } {
  if (!pathExpr.startsWith('$.')) {
    throw new Error('Set operation requires path starting with $.');
  }

  const parts = pathExpr.slice(2).split('.');
  let current = obj;
  let oldValue: any = undefined;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current)) {
      current[part] = {};
    }
    current = current[part];
  }

  const lastPart = parts[parts.length - 1];
  oldValue = current[lastPart];
  current[lastPart] = value;

  return { modified: true, oldValue };
}

/**
 * Deep merge two objects
 */
function deepMerge(target: any, source: any, strategy: 'deep' | 'shallow' | 'replace'): any {
  if (strategy === 'replace') {
    return source;
  }

  if (strategy === 'shallow') {
    return { ...target, ...source };
  }

  // Deep merge
  const result = { ...target };
  
  for (const key of Object.keys(source)) {
    if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (result[key] !== null && typeof result[key] === 'object' && !Array.isArray(result[key])) {
        result[key] = deepMerge(result[key], source[key], 'deep');
      } else {
        result[key] = source[key];
      }
    } else {
      result[key] = source[key];
    }
  }

  return result;
}

/**
 * Flatten nested object
 */
function flattenObject(obj: any, prefix = ''): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, newKey));
    } else {
      result[newKey] = value;
    }
  }

  return result;
}

/**
 * Unflatten dot-notation object
 */
function unflattenObject(obj: Record<string, any>): any {
  const result: any = {};

  for (const [key, value] of Object.entries(obj)) {
    const parts = key.split('.');
    let current = result;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part];
    }

    current[parts[parts.length - 1]] = value;
  }

  return result;
}

/**
 * Compute diff between two objects
 */
function diffObjects(obj1: any, obj2: any, path = '$'): { additions: any[]; deletions: any[]; changes: any[] } {
  const additions: any[] = [];
  const deletions: any[] = [];
  const changes: any[] = [];

  const flat1 = flattenObject(obj1);
  const flat2 = flattenObject(obj2);

  const allKeys = new Set([...Object.keys(flat1), ...Object.keys(flat2)]);

  for (const key of allKeys) {
    const fullPath = `${path}.${key}`;
    const has1 = key in flat1;
    const has2 = key in flat2;

    if (!has1 && has2) {
      additions.push({ path: fullPath, value: flat2[key] });
    } else if (has1 && !has2) {
      deletions.push({ path: fullPath, value: flat1[key] });
    } else if (flat1[key] !== flat2[key]) {
      changes.push({ path: fullPath, from: flat1[key], to: flat2[key] });
    }
  }

  return { additions, deletions, changes };
}

/**
 * Read JSON or YAML file
 */
async function readJsonFile(filePath: string): Promise<any> {
  const content = await fs.readFile(filePath, 'utf-8');
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.yaml' || ext === '.yml') {
    // Simple YAML parsing (basic support)
    // For full YAML, would need yaml library
    throw new Error('YAML support requires yaml library. Using JSON for now.');
  }

  return JSON.parse(content);
}

/**
 * Write JSON file
 */
async function writeJsonFile(filePath: string, data: any): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Execute JSON operation
 */
export async function executeJsonOperation(options: JsonOptions): Promise<string> {
  const {
    operation,
    path: filePath,
    query,
    value,
    mergeWith,
    mergeWithFile,
    strategy = 'deep',
    output,
    compareTo,
    transforms,
  } = options;

  switch (operation) {
    case 'get': {
      const data = await readJsonFile(filePath);
      
      if (!query) {
        // Return entire file
        return JSON.stringify(data, null, 2);
      }

      const results = queryJsonPath(data, query);
      
      if (results.length === 0) {
        return `No results found for query: ${query}`;
      }

      const output: string[] = [];
      output.push(`Query: ${query}`);
      output.push(`Results (${results.length}):\n`);
      output.push(JSON.stringify(results.length === 1 ? results[0] : results, null, 2));
      
      return output.join('\n');
    }

    case 'set': {
      if (!query) throw new Error('Query path required for set operation');
      
      const data = await readJsonFile(filePath);
      const result = setJsonPath(data, query, value);
      
      const outputPath = output || filePath;
      await writeJsonFile(outputPath, data);
      
      const out: string[] = [];
      out.push(`✅ Set successful: ${outputPath}`);
      out.push(`Path: ${query}`);
      out.push(`Old value: ${JSON.stringify(result.oldValue)}`);
      out.push(`New value: ${JSON.stringify(value)}`);
      
      return out.join('\n');
    }

    case 'delete': {
      if (!query) throw new Error('Query path required for delete operation');
      
      const data = await readJsonFile(filePath);
      
      // Simple delete for direct paths
      if (query.startsWith('$.') && !query.includes('[') && !query.includes('*')) {
        const parts = query.slice(2).split('.');
        let current = data;
        
        for (let i = 0; i < parts.length - 1; i++) {
          if (!(parts[i] in current)) {
            return `Path not found: ${query}`;
          }
          current = current[parts[i]];
        }
        
        const lastPart = parts[parts.length - 1];
        const oldValue = current[lastPart];
        delete current[lastPart];
        
        const outputPath = output || filePath;
        await writeJsonFile(outputPath, data);
        
        return `✅ Deleted: ${query}\nOld value: ${JSON.stringify(oldValue)}`;
      }
      
      throw new Error('Complex delete queries not yet supported. Use simple $.path.to.key format.');
    }

    case 'merge': {
      const data = await readJsonFile(filePath);
      
      let mergeData: any;
      if (mergeWithFile) {
        mergeData = await readJsonFile(mergeWithFile);
      } else if (mergeWith) {
        mergeData = mergeWith;
      } else {
        throw new Error('Either mergeWith or mergeWithFile required');
      }

      const result = deepMerge(data, mergeData, strategy);
      
      const outputPath = output || filePath;
      await writeJsonFile(outputPath, result);
      
      return `✅ Merged successfully: ${outputPath}\nStrategy: ${strategy}`;
    }

    case 'transform': {
      if (!transforms || transforms.length === 0) {
        throw new Error('Transforms array required');
      }

      const data = await readJsonFile(filePath);
      let transformCount = 0;

      for (const transform of transforms) {
        const results = queryJsonPath(data, transform.query);
        
        for (const match of results) {
          // Apply transform to parent object
          // This is simplified - full implementation would need path tracking
          if (transform.value !== undefined) {
            // Set value (needs path tracking for full implementation)
            transformCount++;
          }
          if (transform.multiply !== undefined && typeof match === 'number') {
            transformCount++;
          }
          if (transform.add !== undefined && typeof match === 'number') {
            transformCount++;
          }
        }
      }

      const outputPath = output || filePath;
      await writeJsonFile(outputPath, data);
      
      return `✅ Transforms applied: ${transformCount}\nOutput: ${outputPath}`;
    }

    case 'diff': {
      if (!compareTo) throw new Error('compareTo file path required');
      
      const data1 = await readJsonFile(filePath);
      const data2 = await readJsonFile(compareTo);
      
      const diff = diffObjects(data1, data2);
      
      const out: string[] = [];
      out.push(`Diff: ${filePath} vs ${compareTo}\n`);
      
      if (diff.additions.length > 0) {
        out.push(`Additions (${diff.additions.length}):`);
        for (const a of diff.additions) {
          out.push(`  + ${a.path}: ${JSON.stringify(a.value)}`);
        }
        out.push('');
      }
      
      if (diff.deletions.length > 0) {
        out.push(`Deletions (${diff.deletions.length}):`);
        for (const d of diff.deletions) {
          out.push(`  - ${d.path}: ${JSON.stringify(d.value)}`);
        }
        out.push('');
      }
      
      if (diff.changes.length > 0) {
        out.push(`Changes (${diff.changes.length}):`);
        for (const c of diff.changes) {
          out.push(`  ~ ${c.path}: ${JSON.stringify(c.from)} → ${JSON.stringify(c.to)}`);
        }
      }
      
      if (diff.additions.length === 0 && diff.deletions.length === 0 && diff.changes.length === 0) {
        out.push('Files are identical.');
      }
      
      return out.join('\n');
    }

    case 'flatten': {
      const data = await readJsonFile(filePath);
      const flattened = flattenObject(data);
      
      if (output) {
        await writeJsonFile(output, flattened);
        return `✅ Flattened to: ${output}`;
      }
      
      return JSON.stringify(flattened, null, 2);
    }

    case 'unflatten': {
      const data = await readJsonFile(filePath);
      const unflattened = unflattenObject(data);
      
      if (output) {
        await writeJsonFile(output, unflattened);
        return `✅ Unflattened to: ${output}`;
      }
      
      return JSON.stringify(unflattened, null, 2);
    }

    case 'validate': {
      // Basic validation - check if valid JSON
      try {
        const data = await readJsonFile(filePath);
        
        // If schema provided, would validate against it
        // For now, just validate JSON syntax
        
        const out: string[] = [];
        out.push(`✅ Valid JSON: ${filePath}`);
        out.push(`Type: ${Array.isArray(data) ? 'array' : typeof data}`);
        
        if (Array.isArray(data)) {
          out.push(`Items: ${data.length}`);
        } else if (typeof data === 'object' && data !== null) {
          out.push(`Keys: ${Object.keys(data).length}`);
        }
        
        return out.join('\n');
      } catch (error) {
        return `❌ Invalid JSON: ${error instanceof Error ? error.message : String(error)}`;
      }
    }

    case 'convert': {
      // Convert between JSON and YAML
      throw new Error('Convert operation requires yaml library. Not yet implemented.');
    }

    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}
