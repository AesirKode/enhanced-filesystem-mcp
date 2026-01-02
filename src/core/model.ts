/**
 * Model Tool - Safetensors/GGUF metadata inspection
 * Inspect AI models without loading them into memory
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const stat = promisify(fs.stat);
const readdir = promisify(fs.readdir);

// ============================================================================
// Types
// ============================================================================

export interface SafetensorsMetadata {
  format: 'safetensors';
  path: string;
  size: number;
  headerSize: number;
  metadata?: Record<string, any>;
  tensors: {
    name: string;
    dtype: string;
    shape: number[];
  }[];
  tensorCount: number;
  parameters?: number;
}

export interface GGUFMetadata {
  format: 'gguf';
  path: string;
  size: number;
  version: number;
  tensorCount: number;
  metadataKVCount: number;
  architecture?: string;
  quantization?: string;
  contextLength?: number;
  embeddingLength?: number;
  parameters?: number;
  metadata: Record<string, any>;
}

export interface ModelInfo {
  path: string;
  name: string;
  format: 'safetensors' | 'gguf' | 'unknown';
  size: number;
  sizeFormatted: string;
  details?: SafetensorsMetadata | GGUFMetadata;
  error?: string;
}

export interface ModelListResult {
  directory: string;
  models: ModelInfo[];
  totalCount: number;
  totalSize: number;
  totalSizeFormatted: string;
}

// ============================================================================
// Safetensors Parser
// ============================================================================

async function parseSafetensors(filePath: string): Promise<SafetensorsMetadata> {
  const fileStats = await stat(filePath);
  const fd = fs.openSync(filePath, 'r');
  
  try {
    // First 8 bytes = header size (little-endian uint64)
    const sizeBuffer = Buffer.alloc(8);
    fs.readSync(fd, sizeBuffer, 0, 8, 0);
    const headerSize = Number(sizeBuffer.readBigUInt64LE(0));
    
    if (headerSize > 100 * 1024 * 1024) {
      throw new Error(`Header size too large: ${headerSize}`);
    }
    
    // Read header JSON
    const headerBuffer = Buffer.alloc(headerSize);
    fs.readSync(fd, headerBuffer, 0, headerSize, 8);
    const header = JSON.parse(headerBuffer.toString('utf-8'));
    
    // Extract tensors and metadata
    const tensors: SafetensorsMetadata['tensors'] = [];
    let metadata: Record<string, any> | undefined;
    let totalParams = 0;
    
    for (const [key, value] of Object.entries(header)) {
      if (key === '__metadata__') {
        metadata = value as Record<string, any>;
      } else {
        const tensorInfo = value as { dtype: string; shape: number[]; data_offsets: number[] };
        tensors.push({
          name: key,
          dtype: tensorInfo.dtype,
          shape: tensorInfo.shape
        });
        
        // Calculate parameters (product of shape dimensions)
        const params = tensorInfo.shape.reduce((a, b) => a * b, 1);
        totalParams += params;
      }
    }
    
    return {
      format: 'safetensors',
      path: filePath,
      size: fileStats.size,
      headerSize,
      metadata,
      tensors,
      tensorCount: tensors.length,
      parameters: totalParams
    };
  } finally {
    fs.closeSync(fd);
  }
}

// ============================================================================
// GGUF Parser
// ============================================================================

// GGUF data types (for reference)
// 0: uint8, 1: int8, 2: uint16, 3: int16, 4: uint32, 5: int32, 6: float32, 7: bool,
// 8: string, 9: array, 10: uint64, 11: int64, 12: float64

class GGUFReader {
  private fd: number;
  private offset: number = 0;
  
  constructor(filePath: string) {
    this.fd = fs.openSync(filePath, 'r');
  }
  
  close() {
    fs.closeSync(this.fd);
  }
  
  readBytes(length: number): Buffer {
    const buffer = Buffer.alloc(length);
    fs.readSync(this.fd, buffer, 0, length, this.offset);
    this.offset += length;
    return buffer;
  }
  
  readUint8(): number { return this.readBytes(1).readUInt8(0); }
  readUint32(): number { return this.readBytes(4).readUInt32LE(0); }
  readUint64(): bigint { return this.readBytes(8).readBigUInt64LE(0); }
  readInt32(): number { return this.readBytes(4).readInt32LE(0); }
  readInt64(): bigint { return this.readBytes(8).readBigInt64LE(0); }
  readFloat32(): number { return this.readBytes(4).readFloatLE(0); }
  readFloat64(): number { return this.readBytes(8).readDoubleLE(0); }
  readBool(): boolean { return this.readUint8() !== 0; }
  
  readString(): string {
    const length = Number(this.readUint64());
    if (length > 10 * 1024 * 1024) throw new Error('String too long');
    return this.readBytes(length).toString('utf-8');
  }
  
  readValue(type: number): any {
    switch (type) {
      case 0: return this.readUint8();
      case 1: return this.readBytes(1).readInt8(0);
      case 2: return this.readBytes(2).readUInt16LE(0);
      case 3: return this.readBytes(2).readInt16LE(0);
      case 4: return this.readUint32();
      case 5: return this.readInt32();
      case 6: return this.readFloat32();
      case 7: return this.readBool();
      case 8: return this.readString();
      case 9: {
        const arrayType = this.readUint32();
        const arrayLen = Number(this.readUint64());
        if (arrayLen > 100000) return `[array of ${arrayLen} items]`;
        const items: any[] = [];
        for (let i = 0; i < arrayLen; i++) {
          items.push(this.readValue(arrayType));
        }
        return items;
      }
      case 10: return Number(this.readUint64());
      case 11: return Number(this.readInt64());
      case 12: return this.readFloat64();
      default: throw new Error(`Unknown GGUF type: ${type}`);
    }
  }
}

async function parseGGUF(filePath: string): Promise<GGUFMetadata> {
  const fileStats = await stat(filePath);
  const reader = new GGUFReader(filePath);
  
  try {
    // Magic number: "GGUF" (0x46554747)
    const magic = reader.readBytes(4).toString('ascii');
    if (magic !== 'GGUF') {
      throw new Error(`Invalid GGUF magic: ${magic}`);
    }
    
    // Version
    const version = reader.readUint32();
    if (version < 2 || version > 3) {
      throw new Error(`Unsupported GGUF version: ${version}`);
    }
    
    // Counts
    const tensorCount = Number(reader.readUint64());
    const metadataKVCount = Number(reader.readUint64());
    
    // Read metadata key-value pairs
    const metadata: Record<string, any> = {};
    const maxKV = Math.min(metadataKVCount, 500); // Limit for safety
    
    for (let i = 0; i < maxKV; i++) {
      try {
        const key = reader.readString();
        const valueType = reader.readUint32();
        const value = reader.readValue(valueType);
        metadata[key] = value;
      } catch (e) {
        break; // Stop on parse error
      }
    }
    
    // Extract common fields
    const architecture = metadata['general.architecture'] as string | undefined;
    const contextLength = metadata[`${architecture}.context_length`] as number | undefined
      || metadata['llama.context_length'] as number | undefined;
    const embeddingLength = metadata[`${architecture}.embedding_length`] as number | undefined
      || metadata['llama.embedding_length'] as number | undefined;
    
    // Try to detect quantization from filename or metadata
    let quantization: string | undefined;
    const filename = path.basename(filePath).toLowerCase();
    const quantPatterns = ['q2_k', 'q3_k', 'q4_k', 'q4_0', 'q4_1', 'q5_k', 'q5_0', 'q5_1', 
                          'q6_k', 'q8_0', 'q8_1', 'f16', 'f32', 'bf16', 'iq2', 'iq3', 'iq4'];
    for (const pattern of quantPatterns) {
      if (filename.includes(pattern)) {
        quantization = pattern.toUpperCase();
        break;
      }
    }
    
    // Estimate parameters from embedding and block count
    let parameters: number | undefined;
    const blockCount = metadata[`${architecture}.block_count`] as number | undefined
      || metadata['llama.block_count'] as number | undefined;
    if (embeddingLength && blockCount) {
      // Rough estimate: embedding^2 * layers * 4 (approximate transformer formula)
      parameters = Math.round(embeddingLength * embeddingLength * blockCount * 4);
    }
    
    return {
      format: 'gguf',
      path: filePath,
      size: fileStats.size,
      version,
      tensorCount,
      metadataKVCount,
      architecture,
      quantization,
      contextLength,
      embeddingLength,
      parameters,
      metadata
    };
  } finally {
    reader.close();
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  } else if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  } else if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  return `${bytes} bytes`;
}

function formatParameters(params: number): string {
  if (params >= 1e12) return `${(params / 1e12).toFixed(1)}T`;
  if (params >= 1e9) return `${(params / 1e9).toFixed(1)}B`;
  if (params >= 1e6) return `${(params / 1e6).toFixed(1)}M`;
  if (params >= 1e3) return `${(params / 1e3).toFixed(1)}K`;
  return params.toString();
}

async function getModelInfo(filePath: string): Promise<ModelInfo> {
  const fileStats = await stat(filePath);
  const name = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();
  
  const info: ModelInfo = {
    path: filePath,
    name,
    format: 'unknown',
    size: fileStats.size,
    sizeFormatted: formatSize(fileStats.size)
  };
  
  try {
    if (ext === '.safetensors') {
      info.format = 'safetensors';
      info.details = await parseSafetensors(filePath);
    } else if (ext === '.gguf') {
      info.format = 'gguf';
      info.details = await parseGGUF(filePath);
    }
  } catch (e) {
    info.error = (e as Error).message;
  }
  
  return info;
}

async function listModels(directory: string, recursive: boolean = true): Promise<ModelListResult> {
  const models: ModelInfo[] = [];
  const modelExtensions = ['.safetensors', '.gguf'];
  
  async function scanDir(dir: string) {
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && recursive) {
        await scanDir(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (modelExtensions.includes(ext)) {
          const info = await getModelInfo(fullPath);
          models.push(info);
        }
      }
    }
  }
  
  await scanDir(directory);
  
  const totalSize = models.reduce((sum, m) => sum + m.size, 0);
  
  return {
    directory,
    models: models.sort((a, b) => a.name.localeCompare(b.name)),
    totalCount: models.length,
    totalSize,
    totalSizeFormatted: formatSize(totalSize)
  };
}

// ============================================================================
// Main Execute Function
// ============================================================================

export async function executeModelOperation(args: any): Promise<string> {
  const { operation } = args;
  
  switch (operation) {
    case 'info': {
      if (!args.path) throw new Error('path is required');
      
      const info = await getModelInfo(args.path);
      const lines: string[] = [];
      
      lines.push(`Model: ${info.name}`);
      lines.push(`Format: ${info.format.toUpperCase()}`);
      lines.push(`Size: ${info.sizeFormatted}`);
      
      if (info.error) {
        lines.push(`Error: ${info.error}`);
        return lines.join('\n');
      }
      
      if (info.format === 'safetensors' && info.details) {
        const st = info.details as SafetensorsMetadata;
        lines.push(`Header Size: ${formatSize(st.headerSize)}`);
        lines.push(`Tensors: ${st.tensorCount}`);
        if (st.parameters) {
          lines.push(`Parameters: ${formatParameters(st.parameters)}`);
        }
        
        if (st.metadata && Object.keys(st.metadata).length > 0) {
          lines.push('');
          lines.push('Metadata:');
          for (const [key, value] of Object.entries(st.metadata)) {
            const val = typeof value === 'string' && value.length > 100 
              ? value.substring(0, 100) + '...' 
              : value;
            lines.push(`  ${key}: ${val}`);
          }
        }
        
        // Show first few tensors
        if (args.tensors && st.tensors.length > 0) {
          lines.push('');
          lines.push(`Tensors (${st.tensorCount} total):`);
          const showCount = Math.min(st.tensors.length, args.limit || 20);
          for (let i = 0; i < showCount; i++) {
            const t = st.tensors[i];
            lines.push(`  ${t.name}: ${t.dtype} [${t.shape.join(', ')}]`);
          }
          if (st.tensors.length > showCount) {
            lines.push(`  ... and ${st.tensors.length - showCount} more`);
          }
        }
      } else if (info.format === 'gguf' && info.details) {
        const gguf = info.details as GGUFMetadata;
        lines.push(`Version: GGUFv${gguf.version}`);
        lines.push(`Tensors: ${gguf.tensorCount}`);
        if (gguf.architecture) lines.push(`Architecture: ${gguf.architecture}`);
        if (gguf.quantization) lines.push(`Quantization: ${gguf.quantization}`);
        if (gguf.contextLength) lines.push(`Context Length: ${gguf.contextLength.toLocaleString()}`);
        if (gguf.embeddingLength) lines.push(`Embedding Dim: ${gguf.embeddingLength}`);
        if (gguf.parameters) lines.push(`Parameters: ~${formatParameters(gguf.parameters)}`);
        
        // Show key metadata
        if (args.metadata) {
          lines.push('');
          lines.push(`Metadata (${gguf.metadataKVCount} keys):`);
          const keys = Object.keys(gguf.metadata).slice(0, args.limit || 30);
          for (const key of keys) {
            let val = gguf.metadata[key];
            if (typeof val === 'string' && val.length > 80) {
              val = val.substring(0, 80) + '...';
            } else if (Array.isArray(val) && val.length > 5) {
              val = `[${val.slice(0, 5).join(', ')}, ... (${val.length} items)]`;
            }
            lines.push(`  ${key}: ${val}`);
          }
          if (Object.keys(gguf.metadata).length > keys.length) {
            lines.push(`  ... and ${Object.keys(gguf.metadata).length - keys.length} more`);
          }
        }
      }
      
      return lines.join('\n');
    }
    
    case 'list': {
      if (!args.path) throw new Error('path is required');
      
      const result = await listModels(args.path, args.recursive !== false);
      const lines: string[] = [];
      
      lines.push(`Directory: ${result.directory}`);
      lines.push(`Models: ${result.totalCount}`);
      lines.push(`Total Size: ${result.totalSizeFormatted}`);
      lines.push('');
      
      if (result.models.length === 0) {
        lines.push('No models found.');
      } else {
        // Group by format
        const safetensors = result.models.filter(m => m.format === 'safetensors');
        const gguf = result.models.filter(m => m.format === 'gguf');
        
        if (gguf.length > 0) {
          lines.push(`GGUF Models (${gguf.length}):`);
          for (const m of gguf) {
            const details = m.details as GGUFMetadata | undefined;
            const quant = details?.quantization ? ` [${details.quantization}]` : '';
            const arch = details?.architecture ? ` (${details.architecture})` : '';
            lines.push(`  ${m.name}${quant}${arch} - ${m.sizeFormatted}`);
          }
          lines.push('');
        }
        
        if (safetensors.length > 0) {
          lines.push(`Safetensors Models (${safetensors.length}):`);
          for (const m of safetensors) {
            const details = m.details as SafetensorsMetadata | undefined;
            const params = details?.parameters ? ` (~${formatParameters(details.parameters)})` : '';
            lines.push(`  ${m.name}${params} - ${m.sizeFormatted}`);
          }
        }
      }
      
      return lines.join('\n');
    }
    
    case 'compare': {
      if (!args.path1 || !args.path2) {
        throw new Error('path1 and path2 are required');
      }
      
      const [info1, info2] = await Promise.all([
        getModelInfo(args.path1),
        getModelInfo(args.path2)
      ]);
      
      const lines: string[] = ['Model Comparison', ''];
      
      lines.push(`Model 1: ${info1.name}`);
      lines.push(`  Format: ${info1.format.toUpperCase()}`);
      lines.push(`  Size: ${info1.sizeFormatted}`);
      
      lines.push('');
      
      lines.push(`Model 2: ${info2.name}`);
      lines.push(`  Format: ${info2.format.toUpperCase()}`);
      lines.push(`  Size: ${info2.sizeFormatted}`);
      
      lines.push('');
      lines.push('Comparison:');
      
      // Size difference
      const sizeDiff = info1.size - info2.size;
      const sizeDiffPct = ((sizeDiff / info2.size) * 100).toFixed(1);
      if (sizeDiff > 0) {
        lines.push(`  Size: Model 1 is ${formatSize(Math.abs(sizeDiff))} larger (+${sizeDiffPct}%)`);
      } else if (sizeDiff < 0) {
        lines.push(`  Size: Model 1 is ${formatSize(Math.abs(sizeDiff))} smaller (${sizeDiffPct}%)`);
      } else {
        lines.push(`  Size: Identical`);
      }
      
      // Format comparison
      if (info1.format !== info2.format) {
        lines.push(`  Format: Different (${info1.format} vs ${info2.format})`);
      }
      
      // GGUF-specific comparison
      if (info1.format === 'gguf' && info2.format === 'gguf') {
        const g1 = info1.details as GGUFMetadata;
        const g2 = info2.details as GGUFMetadata;
        
        if (g1.architecture && g2.architecture) {
          if (g1.architecture === g2.architecture) {
            lines.push(`  Architecture: Same (${g1.architecture})`);
          } else {
            lines.push(`  Architecture: Different (${g1.architecture} vs ${g2.architecture})`);
          }
        }
        
        if (g1.quantization && g2.quantization) {
          if (g1.quantization === g2.quantization) {
            lines.push(`  Quantization: Same (${g1.quantization})`);
          } else {
            lines.push(`  Quantization: Different (${g1.quantization} vs ${g2.quantization})`);
          }
        }
      }
      
      return lines.join('\n');
    }
    
    case 'search': {
      if (!args.path || !args.query) {
        throw new Error('path and query are required');
      }
      
      const result = await listModels(args.path, true);
      const query = args.query.toLowerCase();
      
      const matches = result.models.filter(m => 
        m.name.toLowerCase().includes(query) ||
        (m.details && 'architecture' in m.details && 
         m.details.architecture?.toLowerCase().includes(query)) ||
        (m.details && 'quantization' in m.details && 
         m.details.quantization?.toLowerCase().includes(query))
      );
      
      if (matches.length === 0) {
        return `No models found matching "${args.query}"`;
      }
      
      const lines: string[] = [`Found ${matches.length} models matching "${args.query}":`, ''];
      
      for (const m of matches) {
        const details = m.format === 'gguf' ? m.details as GGUFMetadata : undefined;
        const extra = details?.architecture ? ` (${details.architecture})` : '';
        lines.push(`  ${m.name}${extra} - ${m.sizeFormatted}`);
        lines.push(`    ${m.path}`);
      }
      
      return lines.join('\n');
    }
    
    default:
      throw new Error(`Unknown model operation: ${operation}. Available: info, list, compare, search`);
  }
}
