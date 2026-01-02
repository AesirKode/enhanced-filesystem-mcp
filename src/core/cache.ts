import { LRUCache } from 'lru-cache';
import { promises as fs } from 'fs';
import path from 'path';

export interface CacheEntry {
  content: Buffer | string;
  metadata: {
    size: number;
    mtime: Date;
    encoding?: string;
  };
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
  hitRate: number;
}

export class CacheManager {
  private cache: LRUCache<string, CacheEntry>;
  private stats = {
    hits: 0,
    misses: 0,
  };

  constructor(maxSize: number = 100) {
    this.cache = new LRUCache<string, CacheEntry>({
      max: maxSize,
      maxSize: 1024 * 1024 * 100, // 100MB total cache size
      sizeCalculation: (entry) => {
        const contentSize = Buffer.isBuffer(entry.content)
          ? entry.content.length
          : Buffer.byteLength(entry.content);
        return contentSize + 1024; // Add overhead for metadata
      },
      ttl: 1000 * 60 * 5, // 5 minute TTL
      updateAgeOnGet: true,
    });
  }

  /**
   * Get file from cache or read from disk
   */
  async get(
    filePath: string,
    readOptions?: { encoding?: BufferEncoding }
  ): Promise<CacheEntry> {
    const normalizedPath = path.normalize(filePath);
    
    // Check cache first
    const cached = this.cache.get(normalizedPath);
    if (cached) {
      // Verify file hasn't changed
      try {
        const stat = await fs.stat(normalizedPath);
        if (
          stat.mtime.getTime() === cached.metadata.mtime.getTime() &&
          stat.size === cached.metadata.size
        ) {
          this.stats.hits++;
          return cached;
        }
      } catch (error) {
        // File may have been deleted, invalidate cache
        this.cache.delete(normalizedPath);
      }
    }

    // Cache miss - read from disk
    this.stats.misses++;
    const entry = await this.readFromDisk(normalizedPath, readOptions);
    this.cache.set(normalizedPath, entry);
    return entry;
  }

  /**
   * Read file from disk
   */
  private async readFromDisk(
    filePath: string,
    readOptions?: { encoding?: BufferEncoding }
  ): Promise<CacheEntry> {
    const stat = await fs.stat(filePath);
    const content = await fs.readFile(
      filePath,
      readOptions?.encoding ? { encoding: readOptions.encoding } : undefined
    );

    return {
      content,
      metadata: {
        size: stat.size,
        mtime: stat.mtime,
        encoding: readOptions?.encoding,
      },
    };
  }

  /**
   * Invalidate cache entry
   */
  invalidate(filePath: string): void {
    const normalizedPath = path.normalize(filePath);
    this.cache.delete(normalizedPath);
  }

  /**
   * Invalidate multiple cache entries
   */
  invalidateMany(filePaths: string[]): void {
    filePaths.forEach((fp) => this.invalidate(fp));
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      maxSize: this.cache.max,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }

  /**
   * Warm cache with frequently accessed files
   */
  async warmCache(filePaths: string[]): Promise<void> {
    await Promise.all(
      filePaths.map((fp) =>
        this.get(fp).catch((error) => {
          console.error(`Failed to warm cache for ${fp}:`, error);
        })
      )
    );
  }
}
