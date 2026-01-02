/**
 * Hash Tool - File checksums and verification
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import { promisify } from 'util';

const stat = promisify(fs.stat);

export type HashAlgorithm = 'md5' | 'sha1' | 'sha256' | 'sha512';

export interface HashResult {
  path: string;
  algorithm: HashAlgorithm;
  hash: string;
  size: number;
  duration: number;
}

export interface VerifyResult {
  path: string;
  algorithm: HashAlgorithm;
  expected: string;
  actual: string;
  match: boolean;
  size: number;
}

export interface CompareResult {
  file1: { path: string; hash: string };
  file2: { path: string; hash: string };
  algorithm: HashAlgorithm;
  identical: boolean;
}

/**
 * Calculate hash of a file using streaming
 */
export async function hashFile(
  filePath: string,
  algorithm: HashAlgorithm = 'sha256'
): Promise<HashResult> {
  const startTime = Date.now();
  const fileStats = await stat(filePath);
  
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash(algorithm);
    const stream = fs.createReadStream(filePath);
    
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => {
      resolve({
        path: filePath,
        algorithm,
        hash: hash.digest('hex'),
        size: fileStats.size,
        duration: Date.now() - startTime
      });
    });
    stream.on('error', reject);
  });
}

/**
 * Calculate hash of a string/buffer
 */
export function hashString(
  data: string | Buffer,
  algorithm: HashAlgorithm = 'sha256'
): string {
  return crypto.createHash(algorithm).update(data).digest('hex');
}

/**
 * Verify a file against an expected hash
 */
export async function verifyFile(
  filePath: string,
  expectedHash: string,
  algorithm: HashAlgorithm = 'sha256'
): Promise<VerifyResult> {
  const result = await hashFile(filePath, algorithm);
  const normalizedExpected = expectedHash.toLowerCase().trim();
  const normalizedActual = result.hash.toLowerCase();
  
  return {
    path: filePath,
    algorithm,
    expected: normalizedExpected,
    actual: normalizedActual,
    match: normalizedExpected === normalizedActual,
    size: result.size
  };
}

/**
 * Compare two files by hash
 */
export async function compareFiles(
  file1: string,
  file2: string,
  algorithm: HashAlgorithm = 'sha256'
): Promise<CompareResult> {
  const [hash1, hash2] = await Promise.all([
    hashFile(file1, algorithm),
    hashFile(file2, algorithm)
  ]);
  
  return {
    file1: { path: file1, hash: hash1.hash },
    file2: { path: file2, hash: hash2.hash },
    algorithm,
    identical: hash1.hash === hash2.hash
  };
}

/**
 * Hash multiple files in parallel
 */
export async function hashMultiple(
  filePaths: string[],
  algorithm: HashAlgorithm = 'sha256'
): Promise<HashResult[]> {
  return Promise.all(filePaths.map(fp => hashFile(fp, algorithm)));
}

export async function executeHashOperation(args: any): Promise<string> {
  const { operation, algorithm = 'sha256' } = args;

  switch (operation) {
    case 'hash': {
      if (!args.path) {
        throw new Error('path is required');
      }
      
      const result = await hashFile(args.path, algorithm);
      const sizeStr = result.size > 1024 * 1024
        ? `${(result.size / 1024 / 1024).toFixed(2)} MB`
        : `${(result.size / 1024).toFixed(2)} KB`;
      
      return [
        `File: ${result.path}`,
        `Algorithm: ${result.algorithm.toUpperCase()}`,
        `Hash: ${result.hash}`,
        `Size: ${sizeStr}`,
        `Duration: ${result.duration}ms`
      ].join('\n');
    }
    
    case 'verify': {
      if (!args.path || !args.expected) {
        throw new Error('path and expected hash are required');
      }
      
      const result = await verifyFile(args.path, args.expected, algorithm);
      
      if (result.match) {
        return `✅ Hash verified!\n\nFile: ${result.path}\nAlgorithm: ${result.algorithm.toUpperCase()}\nHash: ${result.actual}`;
      } else {
        return `❌ Hash mismatch!\n\nFile: ${result.path}\nAlgorithm: ${result.algorithm.toUpperCase()}\nExpected: ${result.expected}\nActual: ${result.actual}`;
      }
    }
    
    case 'compare': {
      if (!args.file1 || !args.file2) {
        throw new Error('file1 and file2 are required');
      }
      
      const result = await compareFiles(args.file1, args.file2, algorithm);
      
      if (result.identical) {
        return `✅ Files are identical!\n\nAlgorithm: ${result.algorithm.toUpperCase()}\nHash: ${result.file1.hash}\n\nFile 1: ${result.file1.path}\nFile 2: ${result.file2.path}`;
      } else {
        return `❌ Files are different!\n\nAlgorithm: ${result.algorithm.toUpperCase()}\n\nFile 1: ${result.file1.path}\n  Hash: ${result.file1.hash}\n\nFile 2: ${result.file2.path}\n  Hash: ${result.file2.hash}`;
      }
    }
    
    case 'multiple': {
      if (!args.paths || !Array.isArray(args.paths)) {
        throw new Error('paths (array) is required');
      }
      
      const results = await hashMultiple(args.paths, algorithm);
      
      const output: string[] = [
        `Hashed ${results.length} files (${algorithm.toUpperCase()}):`,
        ''
      ];
      
      for (const result of results) {
        output.push(`${result.hash}  ${result.path}`);
      }
      
      return output.join('\n');
    }
    
    case 'string': {
      if (!args.data) {
        throw new Error('data is required');
      }
      
      const hash = hashString(args.data, algorithm);
      return `Algorithm: ${algorithm.toUpperCase()}\nHash: ${hash}`;
    }
    
    default:
      throw new Error(`Unknown hash operation: ${operation}`);
  }
}
