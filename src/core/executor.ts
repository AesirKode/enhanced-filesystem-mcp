import PQueue from 'p-queue';
import os from 'os';

export interface ExecutorStats {
  pending: number;
  active: number;
  completed: number;
  failed: number;
}

export class ParallelExecutor {
  private queue: PQueue;
  private stats = {
    completed: 0,
    failed: 0,
  };

  constructor(concurrency?: number) {
    // Default to CPU count or user-specified
    const maxConcurrency = concurrency || os.cpus().length;
    
    this.queue = new PQueue({
      concurrency: maxConcurrency,
      autoStart: true,
    });

    console.error(`Parallel executor initialized with concurrency: ${maxConcurrency}`);
  }

  /**
   * Execute a single task
   */
  async execute<T>(task: () => Promise<T>): Promise<T> {
    const result = await this.queue.add(async () => {
      try {
        const value = await task();
        this.stats.completed++;
        return value;
      } catch (error) {
        this.stats.failed++;
        throw error;
      }
    });
    return result as T;
  }

  /**
   * Execute multiple tasks in parallel
   */
  async executeMany<T>(tasks: (() => Promise<T>)[]): Promise<T[]> {
    return Promise.all(tasks.map((task) => this.execute(task)));
  }

  /**
   * Execute tasks with individual error handling
   * Returns results with success/error status
   */
  async executeAllSettled<T>(
    tasks: (() => Promise<T>)[]
  ): Promise<Array<{ status: 'fulfilled'; value: T } | { status: 'rejected'; reason: any }>> {
    const promises = tasks.map((task) =>
      this.execute(task).then(
        (value) => ({ status: 'fulfilled' as const, value }),
        (reason) => ({ status: 'rejected' as const, reason })
      )
    );
    return Promise.all(promises);
  }

  /**
   * Execute tasks and return only successful results
   */
  async executeFiltered<T>(tasks: (() => Promise<T>)[]): Promise<T[]> {
    const results = await this.executeAllSettled(tasks);
    return results
      .filter((r): r is { status: 'fulfilled'; value: T } => r.status === 'fulfilled')
      .map((r) => r.value);
  }

  /**
   * Get executor statistics
   */
  getStats(): ExecutorStats {
    return {
      pending: this.queue.pending,
      active: this.queue.size,
      completed: this.stats.completed,
      failed: this.stats.failed,
    };
  }

  /**
   * Wait for all pending tasks to complete
   */
  async onIdle(): Promise<void> {
    await this.queue.onIdle();
  }

  /**
   * Clear pending tasks
   */
  clear(): void {
    this.queue.clear();
  }

  /**
   * Pause execution
   */
  pause(): void {
    this.queue.pause();
  }

  /**
   * Resume execution
   */
  start(): void {
    this.queue.start();
  }
}
