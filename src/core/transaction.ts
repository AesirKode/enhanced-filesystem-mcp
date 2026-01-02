import { promises as fs } from 'fs';
import path from 'path';

let transactionCounter = 0;

export interface Operation {
  type: 'read' | 'write' | 'delete' | 'move' | 'edit';
  path: string;
  newPath?: string; // For move operations
  content?: string | Buffer; // For write operations
  backup?: string | Buffer; // Original content for rollback
}

export interface Transaction {
  id: string;
  operations: Operation[];
  backups: Map<string, { content: string | Buffer; existed: boolean }>;
  completed: boolean;
  rolledBack: boolean;
}

export class TransactionManager {
  private activeTransactions = new Map<string, Transaction>();
  private tempDir = path.join(process.cwd(), '.efs-temp');

  constructor() {
    this.ensureTempDir();
  }

  /**
   * Ensure temp directory exists
   */
  private async ensureTempDir(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create temp directory:', error);
    }
  }

  /**
   * Begin a new transaction
   */
  begin(): string {
    const txId = `tx_${++transactionCounter}`;
    const transaction: Transaction = {
      id: txId,
      operations: [],
      backups: new Map(),
      completed: false,
      rolledBack: false,
    };
    this.activeTransactions.set(txId, transaction);
    return txId;
  }

  /**
   * Add operation to transaction
   */
  async addOperation(txId: string, operation: Operation): Promise<void> {
    const tx = this.activeTransactions.get(txId);
    if (!tx) {
      throw new Error(`Transaction ${txId} not found`);
    }
    if (tx.completed) {
      throw new Error(`Transaction ${txId} already completed`);
    }

    // Create backup before operation
    if (operation.type !== 'read') {
      await this.createBackup(tx, operation.path);
    }

    tx.operations.push(operation);
  }

  /**
   * Create backup of file before modification
   */
  private async createBackup(tx: Transaction, filePath: string): Promise<void> {
    if (tx.backups.has(filePath)) {
      return; // Already backed up
    }

    try {
      const content = await fs.readFile(filePath);
      tx.backups.set(filePath, { content, existed: true });
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        tx.backups.set(filePath, { content: '', existed: false });
      } else {
        throw error;
      }
    }
  }

  /**
   * Commit transaction - execute all operations
   */
  async commit(txId: string): Promise<void> {
    const tx = this.activeTransactions.get(txId);
    if (!tx) {
      throw new Error(`Transaction ${txId} not found`);
    }
    if (tx.completed) {
      throw new Error(`Transaction ${txId} already completed`);
    }

    try {
      // Execute all operations
      for (const op of tx.operations) {
        await this.executeOperation(op);
      }

      tx.completed = true;
      
      // Clean up backups after successful commit
      setTimeout(() => this.cleanup(txId), 5000);
    } catch (error) {
      // Rollback on any error
      await this.rollback(txId);
      throw error;
    }
  }

  /**
   * Execute a single operation
   */
  private async executeOperation(op: Operation): Promise<void> {
    switch (op.type) {
      case 'write':
        if (!op.content) {
          throw new Error('Write operation requires content');
        }
        await fs.writeFile(op.path, op.content);
        break;

      case 'delete':
        await fs.unlink(op.path);
        break;

      case 'move':
        if (!op.newPath) {
          throw new Error('Move operation requires newPath');
        }
        await fs.rename(op.path, op.newPath);
        break;

      case 'edit':
        if (!op.content) {
          throw new Error('Edit operation requires content');
        }
        await fs.writeFile(op.path, op.content);
        break;

      case 'read':
        // No action needed for reads
        break;

      default:
        throw new Error(`Unknown operation type: ${(op as any).type}`);
    }
  }

  /**
   * Rollback transaction - restore all backups
   */
  async rollback(txId: string): Promise<void> {
    const tx = this.activeTransactions.get(txId);
    if (!tx) {
      throw new Error(`Transaction ${txId} not found`);
    }

    try {
      // Restore all backups in reverse order
      for (const [filePath, backup] of tx.backups.entries()) {
        try {
          if (backup.existed) {
            await fs.writeFile(filePath, backup.content);
          } else {
            // File didn't exist before, delete it
            await fs.unlink(filePath).catch(() => {}); // Ignore if already deleted
          }
        } catch (error) {
          console.error(`Failed to restore backup for ${filePath}:`, error);
        }
      }

      tx.rolledBack = true;
      tx.completed = true;
    } finally {
      this.cleanup(txId);
    }
  }

  /**
   * Clean up transaction
   */
  private cleanup(txId: string): void {
    this.activeTransactions.delete(txId);
  }

  /**
   * Get transaction info
   */
  getTransaction(txId: string): Transaction | undefined {
    return this.activeTransactions.get(txId);
  }

  /**
   * List active transactions
   */
  listTransactions(): Transaction[] {
    return Array.from(this.activeTransactions.values());
  }
}
