import { promises as fs } from 'fs';
import { createWriteStream } from 'fs';
import path from 'path';
import { CacheManager } from '../core/cache.js';

interface WriteOptions {
  mode?: 'rewrite' | 'append';
  encoding?: BufferEncoding;
}

export class FileWriter {
  constructor(private cache: CacheManager) {}

  /**
   * Write file with streaming support - NO CHUNKING REQUIRED
   * Handles files of any size efficiently
   */
  async write(
    filePath: string,
    content: string | Buffer,
    options: WriteOptions = {}
  ): Promise<{ bytesWritten: number; success: true }> {
    const { mode = 'rewrite', encoding = 'utf8' } = options;
    const normalizedPath = path.normalize(filePath);

    // Ensure directory exists
    await fs.mkdir(path.dirname(normalizedPath), { recursive: true });

    // For small content, use simple writeFile
    const contentSize = typeof content === 'string' 
      ? Buffer.byteLength(content, encoding)
      : content.length;

    if (contentSize < 1024 * 1024) {
      // < 1MB: Simple write
      if (mode === 'append') {
        await fs.appendFile(normalizedPath, content, encoding);
      } else {
        await fs.writeFile(normalizedPath, content, encoding);
      }
      
      // Invalidate cache
      this.cache.invalidate(normalizedPath);
      
      return { bytesWritten: contentSize, success: true };
    }

    // For large content, use streaming
    return this.streamWrite(normalizedPath, content, mode, encoding);
  }

  /**
   * Stream large content to file
   */
  private async streamWrite(
    filePath: string,
    content: string | Buffer,
    mode: 'rewrite' | 'append',
    encoding: BufferEncoding
  ): Promise<{ bytesWritten: number; success: true }> {
    return new Promise((resolve, reject) => {
      const stream = createWriteStream(filePath, {
        flags: mode === 'append' ? 'a' : 'w',
        encoding: typeof content === 'string' ? encoding : undefined,
      });

      let bytesWritten = 0;

      stream.on('error', (error) => {
        reject(error);
      });

      stream.on('finish', () => {
        this.cache.invalidate(filePath);
        resolve({ bytesWritten, success: true });
      });

      // Write in chunks if string is very large
      if (typeof content === 'string') {
        const chunkSize = 1024 * 1024; // 1MB chunks
        let offset = 0;

        const writeNext = () => {
          while (offset < content.length) {
            const chunk = content.slice(offset, offset + chunkSize);
            offset += chunk.length;
            bytesWritten += Buffer.byteLength(chunk, encoding);

            if (!stream.write(chunk, encoding)) {
              // Wait for drain
              stream.once('drain', writeNext);
              return;
            }
          }
          stream.end();
        };

        writeNext();
      } else {
        // Buffer: write directly
        bytesWritten = content.length;
        stream.write(content);
        stream.end();
      }
    });
  }
}
