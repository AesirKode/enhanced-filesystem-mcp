import { promises as fs } from 'fs';
import { createReadStream } from 'fs';
import path from 'path';
import { CacheManager } from '../core/cache.js';

interface ReadOptions {
  offset?: number;
  length?: number;
  encoding?: BufferEncoding;
}

export class FileReader {
  constructor(private cache: CacheManager) {}

  /**
   * Read file with caching and pagination
   */
  async read(
    filePath: string,
    options: ReadOptions = {}
  ): Promise<{ content: string; stats: { size: number; lines?: number } }> {
    const { offset = 0, length, encoding = 'utf8' } = options;
    const normalizedPath = path.normalize(filePath);

    // Get file stats
    const stat = await fs.stat(normalizedPath);

    // For small files, use cache
    if (stat.size < 1024 * 1024 * 10) {
      // < 10MB: Use cache
      const cached = await this.cache.get(normalizedPath, { encoding });
      const content = Buffer.isBuffer(cached.content)
        ? cached.content.toString(encoding)
        : cached.content;

      return this.applyPagination(content, offset, length, stat.size);
    }

    // For large files, stream and paginate
    const content = await this.streamRead(normalizedPath, encoding);
    return this.applyPagination(content, offset, length, stat.size);
  }

  /**
   * Stream read for large files
   */
  private async streamRead(
    filePath: string,
    encoding: BufferEncoding
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: string[] = [];
      const stream = createReadStream(filePath, { encoding });

      stream.on('data', (chunk: Buffer | string) => {
        const str = typeof chunk === 'string' ? chunk : chunk.toString(encoding);
        chunks.push(str);
      });

      stream.on('error', reject);

      stream.on('end', () => {
        resolve(chunks.join(''));
      });
    });
  }

  /**
   * Apply offset/length pagination to content
   */
  private applyPagination(
    content: string,
    offset: number,
    length: number | undefined,
    fileSize: number
  ): { content: string; stats: { size: number; lines: number } } {
    const lines = content.split('\n');
    const totalLines = lines.length;

    let startLine = offset;
    let endLine = length ? offset + length : totalLines;

    // Handle negative offset (from end)
    if (offset < 0) {
      startLine = Math.max(0, totalLines + offset);
      endLine = totalLines;
    }

    // Clamp to valid range
    startLine = Math.max(0, Math.min(startLine, totalLines));
    endLine = Math.max(startLine, Math.min(endLine, totalLines));

    const selectedLines = lines.slice(startLine, endLine);
    const paginatedContent = selectedLines.join('\n');

    return {
      content: paginatedContent,
      stats: {
        size: fileSize,
        lines: totalLines,
      },
    };
  }

  /**
   * Read multiple files in parallel
   */
  async readMultiple(
    filePaths: string[],
    options: ReadOptions = {}
  ): Promise<Array<{ path: string; content: string; error?: string }>> {
    const results = await Promise.allSettled(
      filePaths.map(async (filePath) => {
        const result = await this.read(filePath, options);
        return { path: filePath, content: result.content };
      })
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          path: filePaths[index],
          content: '',
          error: result.reason.message,
        };
      }
    });
  }
}
