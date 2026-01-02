import { promises as fs } from 'fs';
import { editFile } from './editor.js';
import { listDirectory } from './lister.js';

export interface BatchOperation {
  op: 'read' | 'write' | 'edit' | 'delete' | 'move' | 'list';
  path: string;
  content?: string;
  oldText?: string;
  newText?: string;
  source?: string;
  destination?: string;
  count?: number;
}

export interface BatchOptions {
  operations: BatchOperation[];
  atomic?: boolean;
  parallel?: boolean;
}

export interface BatchResult {
  success: boolean;
  results: any[];
  errors: string[];
}

export async function executeBatchOperations(options: BatchOptions): Promise<BatchResult> {
  const { operations, atomic = true, parallel = true } = options;
  
  const results: any[] = [];
  const errors: string[] = [];
  const backups: Map<string, string> = new Map();

  try {
    // Create backups if atomic
    if (atomic) {
      for (const op of operations) {
        if (op.op === 'write' || op.op === 'edit' || op.op === 'delete' || op.op === 'move') {
          const targetPath = op.op === 'move' ? op.source! : op.path;
          try {
            const content = await fs.readFile(targetPath, 'utf-8');
            backups.set(targetPath, content);
          } catch {
            // File doesn't exist, no backup needed
          }
        }
      }
    }

    // Execute operations
    if (parallel) {
      // Execute read-only operations in parallel
      const readOps = operations.filter(op => op.op === 'read' || op.op === 'list');
      const writeOps = operations.filter(op => op.op !== 'read' && op.op !== 'list');

      // Execute reads in parallel
      const readResults = await Promise.all(
        readOps.map(op => executeOperation(op))
      );
      results.push(...readResults);

      // Execute writes sequentially
      for (const op of writeOps) {
        const result = await executeOperation(op);
        results.push(result);
      }
    } else {
      // Execute all sequentially
      for (const op of operations) {
        const result = await executeOperation(op);
        results.push(result);
      }
    }

    return {
      success: true,
      results,
      errors,
    };

  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));

    // Rollback if atomic
    if (atomic && backups.size > 0) {
      for (const [path, content] of backups.entries()) {
        try {
          await fs.writeFile(path, content, 'utf-8');
        } catch (rollbackError) {
          errors.push(`Rollback failed for ${path}: ${rollbackError}`);
        }
      }
    }

    return {
      success: false,
      results,
      errors,
    };
  }
}

async function executeOperation(op: BatchOperation): Promise<any> {
  switch (op.op) {
    case 'read': {
      const content = await fs.readFile(op.path, 'utf-8');
      return { op: 'read', path: op.path, content };
    }

    case 'write': {
      await fs.writeFile(op.path, op.content || '', 'utf-8');
      return { op: 'write', path: op.path, size: op.content?.length || 0 };
    }

    case 'edit': {
      if (!op.oldText || !op.newText) {
        throw new Error('Edit requires oldText and newText');
      }
      const result = await editFile(op.path, {
        oldText: op.oldText,
        newText: op.newText,
        count: op.count || 1
      });
      return { op: 'edit', path: op.path, replacements: result.replacements };
    }

    case 'delete': {
      await fs.rm(op.path, { recursive: true, force: true });
      return { op: 'delete', path: op.path };
    }

    case 'move': {
      if (!op.destination) {
        throw new Error('Move requires destination');
      }
      await fs.rename(op.path, op.destination);
      return { op: 'move', from: op.path, to: op.destination };
    }

    case 'list': {
      const entries = await listDirectory(op.path);
      return { op: 'list', path: op.path, entries };
    }

    default:
      throw new Error(`Unknown operation: ${(op as any).op}`);
  }
}
