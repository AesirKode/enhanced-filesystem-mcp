/**
 * Download Tool - Smart model downloads with progress, resume, and auto-placement
 * Supports: Direct URLs, CivitAI, HuggingFace
 */

import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
import { createHash } from 'crypto';

// Model directory mappings
const MODEL_PATHS: Record<string, string> = {
  // LLM models
  'gguf': 'D:\\Models\\llm\\gguf',
  'llm': 'D:\\Models\\llm\\gguf',
  
  // Image model bases by architecture
  'checkpoint': 'D:\\Models\\image\\base',
  'sd15': 'D:\\Models\\image\\base\\sd15',
  'sdxl': 'D:\\Models\\image\\base\\sdxl',
  'pony': 'D:\\Models\\image\\base\\pony',
  'flux': 'D:\\Models\\image\\flux',
  'sd3': 'D:\\Models\\image\\base\\sd3',
  
  // Image model components
  'lora': 'D:\\Models\\image\\lora',
  'lycoris': 'D:\\Models\\image\\lora',
  'vae': 'D:\\Models\\image\\vae',
  'controlnet': 'D:\\Models\\image\\controlnet',
  'embedding': 'D:\\Models\\image\\embeddings',
  'textual_inversion': 'D:\\Models\\image\\embeddings',
  'upscaler': 'D:\\Models\\image\\upscale',
  'ipadapter': 'D:\\Models\\image\\ipadapter',
  
  // Video
  'video': 'D:\\Models\\video\\base',
  'motion': 'D:\\Models\\video\\motion',
  
  // Default
  'default': 'D:\\Models'
};

export interface DownloadProgress {
  url: string;
  filename: string;
  destination: string;
  totalBytes: number;
  downloadedBytes: number;
  percent: number;
  speed: string;
  eta: string;
  status: 'pending' | 'downloading' | 'paused' | 'completed' | 'failed' | 'verifying';
  error?: string;
}

export interface DownloadResult {
  success: boolean;
  path?: string;
  filename?: string;
  size?: number;
  duration?: number;
  speed?: string;
  hash?: string;
  error?: string;
}

export interface CivitAIModelInfo {
  id: number;
  name: string;
  type: string;
  description?: string;
  creator?: string;
  tags?: string[];
  modelVersions?: Array<{
    id: number;
    name: string;
    downloadUrl: string;
    files: Array<{
      name: string;
      sizeKB: number;
      type: string;
      hashes?: {
        SHA256?: string;
      };
    }>;
  }>;
}

/**
 * Parse CivitAI URL to extract model ID
 */
function parseCivitAIUrl(url: string): { modelId: number; versionId?: number } | null {
  // https://civitai.com/models/123456/model-name
  // https://civitai.com/models/123456?modelVersionId=789
  const match = url.match(/civitai\.com\/models\/(\d+)/);
  if (!match) return null;
  
  const modelId = parseInt(match[1]);
  const versionMatch = url.match(/modelVersionId=(\d+)/);
  const versionId = versionMatch ? parseInt(versionMatch[1]) : undefined;
  
  return { modelId, versionId };
}

/**
 * Parse HuggingFace URL
 */
function parseHuggingFaceUrl(url: string): { repo: string; file?: string } | null {
  // https://huggingface.co/TheBloke/model-name-GGUF/blob/main/model.Q4_K_M.gguf
  // https://huggingface.co/TheBloke/model-name-GGUF/resolve/main/model.Q4_K_M.gguf
  const match = url.match(/huggingface\.co\/([^\/]+\/[^\/]+)/);
  if (!match) return null;
  
  const repo = match[1];
  const fileMatch = url.match(/(?:blob|resolve)\/[^\/]+\/(.+)$/);
  const file = fileMatch ? fileMatch[1] : undefined;
  
  return { repo, file };
}

/**
 * Get CivitAI model info via API
 */
async function getCivitAIModelInfo(modelId: number): Promise<CivitAIModelInfo> {
  return new Promise((resolve, reject) => {
    const url = `https://civitai.com/api/v1/models/${modelId}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse CivitAI response: ${e}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Determine the best destination folder based on file type and model type
 */
function getDestinationPath(filename: string, modelType?: string, subType?: string): string {
  const ext = path.extname(filename).toLowerCase();
  const nameLower = filename.toLowerCase();
  
  // GGUF files go to LLM folder
  if (ext === '.gguf') {
    return MODEL_PATHS['gguf'];
  }
  
  // Safetensors - determine by model type or filename hints
  if (ext === '.safetensors' || ext === '.pt' || ext === '.ckpt') {
    // Check model type from CivitAI
    if (modelType) {
      const typeLower = modelType.toLowerCase();
      if (typeLower.includes('lora') || typeLower.includes('lycoris')) {
        // Further categorize LoRA by architecture
        if (subType) {
          const subLower = subType.toLowerCase();
          if (subLower.includes('pony')) return path.join(MODEL_PATHS['lora'], 'pony');
          if (subLower.includes('sdxl')) return path.join(MODEL_PATHS['lora'], 'sdxl');
          if (subLower.includes('sd15') || subLower.includes('sd 1.5')) return path.join(MODEL_PATHS['lora'], 'sd15');
        }
        return MODEL_PATHS['lora'];
      }
      if (typeLower.includes('checkpoint')) {
        if (subType) {
          const subLower = subType.toLowerCase();
          if (subLower.includes('pony')) return MODEL_PATHS['pony'];
          if (subLower.includes('sdxl')) return MODEL_PATHS['sdxl'];
          if (subLower.includes('sd15') || subLower.includes('sd 1.5')) return MODEL_PATHS['sd15'];
          if (subLower.includes('flux')) return MODEL_PATHS['flux'];
        }
        return MODEL_PATHS['checkpoint'];
      }
      if (typeLower.includes('vae')) return MODEL_PATHS['vae'];
      if (typeLower.includes('controlnet')) return MODEL_PATHS['controlnet'];
      if (typeLower.includes('embedding') || typeLower.includes('textual')) return MODEL_PATHS['embedding'];
      if (typeLower.includes('upscal')) return MODEL_PATHS['upscaler'];
    }
    
    // Guess from filename
    if (nameLower.includes('lora')) return MODEL_PATHS['lora'];
    if (nameLower.includes('vae')) return MODEL_PATHS['vae'];
    if (nameLower.includes('controlnet')) return MODEL_PATHS['controlnet'];
    if (nameLower.includes('pony')) return MODEL_PATHS['pony'];
    if (nameLower.includes('sdxl') || nameLower.includes('xl')) return MODEL_PATHS['sdxl'];
    if (nameLower.includes('flux')) return MODEL_PATHS['flux'];
    
    return MODEL_PATHS['checkpoint'];
  }
  
  return MODEL_PATHS['default'];
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format duration
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

/**
 * Download file with progress tracking
 */
async function downloadFile(
  url: string,
  destination: string,
  options: {
    expectedHash?: string;
    onProgress?: (progress: DownloadProgress) => void;
    resume?: boolean;
  } = {}
): Promise<DownloadResult> {
  const startTime = Date.now();
  
  return new Promise((resolve, reject) => {
    // Ensure destination directory exists
    const dir = path.dirname(destination);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const filename = path.basename(destination);
    let downloadedBytes = 0;
    let totalBytes = 0;
    let lastProgressTime = Date.now();
    let lastDownloadedBytes = 0;
    
    // Check for existing partial download
    const headers: Record<string, string> = {};
    if (options.resume && fs.existsSync(destination)) {
      const stats = fs.statSync(destination);
      downloadedBytes = stats.size;
      headers['Range'] = `bytes=${downloadedBytes}-`;
    }
    
    const protocol = url.startsWith('https') ? https : http;
    const parsedUrl = new URL(url);
    
    const requestOptions = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...headers
      }
    };
    
    const request = protocol.get(requestOptions, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          downloadFile(redirectUrl, destination, options).then(resolve).catch(reject);
          return;
        }
      }
      
      if (response.statusCode !== 200 && response.statusCode !== 206) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }
      
      // Get total size
      const contentLength = response.headers['content-length'];
      if (contentLength) {
        totalBytes = parseInt(contentLength) + downloadedBytes;
      }
      
      // Open file for writing
      const writeStream = fs.createWriteStream(destination, {
        flags: downloadedBytes > 0 ? 'a' : 'w'
      });
      
      response.on('data', (chunk: Buffer) => {
        downloadedBytes += chunk.length;
        
        // Calculate progress
        const now = Date.now();
        const timeDiff = (now - lastProgressTime) / 1000;
        
        if (timeDiff >= 1 && options.onProgress) {
          const bytesDiff = downloadedBytes - lastDownloadedBytes;
          const speed = bytesDiff / timeDiff;
          const remaining = totalBytes - downloadedBytes;
          const eta = speed > 0 ? remaining / speed : 0;
          
          options.onProgress({
            url,
            filename,
            destination,
            totalBytes,
            downloadedBytes,
            percent: totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 0,
            speed: formatBytes(speed) + '/s',
            eta: formatDuration(eta),
            status: 'downloading'
          });
          
          lastProgressTime = now;
          lastDownloadedBytes = downloadedBytes;
        }
      });
      
      response.pipe(writeStream);
      
      writeStream.on('finish', async () => {
        const duration = (Date.now() - startTime) / 1000;
        const avgSpeed = downloadedBytes / duration;
        
        // Verify hash if provided
        let hash: string | undefined;
        if (options.expectedHash) {
          if (options.onProgress) {
            options.onProgress({
              url, filename, destination, totalBytes, downloadedBytes,
              percent: 100, speed: '0 B/s', eta: '0s', status: 'verifying'
            });
          }
          
          hash = await calculateFileHash(destination);
          if (hash.toLowerCase() !== options.expectedHash.toLowerCase()) {
            resolve({
              success: false,
              path: destination,
              filename,
              size: downloadedBytes,
              duration,
              error: `Hash mismatch! Expected: ${options.expectedHash}, Got: ${hash}`
            });
            return;
          }
        }
        
        resolve({
          success: true,
          path: destination,
          filename,
          size: downloadedBytes,
          duration,
          speed: formatBytes(avgSpeed) + '/s',
          hash
        });
      });
      
      writeStream.on('error', (err) => {
        reject(new Error(`Write error: ${err.message}`));
      });
    });
    
    request.on('error', (err) => {
      reject(new Error(`Download error: ${err.message}`));
    });
    
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Download timeout'));
    });
  });
}

/**
 * Calculate SHA256 hash of file
 */
async function calculateFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = fs.createReadStream(filePath);
    
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Download from CivitAI
 */
async function downloadFromCivitAI(
  urlOrId: string | number,
  options: {
    versionId?: number;
    destination?: string;
    onProgress?: (progress: DownloadProgress) => void;
  } = {}
): Promise<DownloadResult> {
  let modelId: number;
  let versionId = options.versionId;
  
  if (typeof urlOrId === 'string') {
    const parsed = parseCivitAIUrl(urlOrId);
    if (!parsed) {
      throw new Error('Invalid CivitAI URL');
    }
    modelId = parsed.modelId;
    versionId = versionId || parsed.versionId;
  } else {
    modelId = urlOrId;
  }
  
  // Get model info
  const modelInfo = await getCivitAIModelInfo(modelId);
  
  if (!modelInfo.modelVersions || modelInfo.modelVersions.length === 0) {
    throw new Error('No versions available for this model');
  }
  
  // Find the right version
  let version = modelInfo.modelVersions[0]; // Default to latest
  if (versionId) {
    const found = modelInfo.modelVersions.find(v => v.id === versionId);
    if (found) version = found;
  }
  
  // Find the primary file (usually the largest safetensors/ckpt)
  const file = version.files.find(f => 
    f.name.endsWith('.safetensors') || 
    f.name.endsWith('.ckpt') ||
    f.name.endsWith('.gguf')
  ) || version.files[0];
  
  if (!file) {
    throw new Error('No downloadable file found');
  }
  
  // Determine destination
  const destDir = options.destination || getDestinationPath(
    file.name, 
    modelInfo.type,
    version.name
  );
  const destPath = path.join(destDir, file.name);
  
  // Build download URL
  const downloadUrl = version.downloadUrl || `https://civitai.com/api/download/models/${version.id}`;
  
  // Download with hash verification
  return downloadFile(downloadUrl, destPath, {
    expectedHash: file.hashes?.SHA256,
    onProgress: options.onProgress,
    resume: true
  });
}

/**
 * Download from HuggingFace
 */
async function downloadFromHuggingFace(
  urlOrRepo: string,
  options: {
    file?: string;
    destination?: string;
    onProgress?: (progress: DownloadProgress) => void;
  } = {}
): Promise<DownloadResult> {
  let repo: string;
  let file = options.file;
  
  if (urlOrRepo.includes('huggingface.co')) {
    const parsed = parseHuggingFaceUrl(urlOrRepo);
    if (!parsed) {
      throw new Error('Invalid HuggingFace URL');
    }
    repo = parsed.repo;
    file = file || parsed.file;
  } else {
    repo = urlOrRepo;
  }
  
  if (!file) {
    throw new Error('File path is required for HuggingFace downloads');
  }
  
  // Build download URL
  const downloadUrl = `https://huggingface.co/${repo}/resolve/main/${file}`;
  
  // Determine destination
  const filename = path.basename(file);
  const destDir = options.destination || getDestinationPath(filename);
  const destPath = path.join(destDir, filename);
  
  return downloadFile(downloadUrl, destPath, {
    onProgress: options.onProgress,
    resume: true
  });
}

/**
 * Download from direct URL
 */
async function downloadFromUrl(
  url: string,
  options: {
    filename?: string;
    destination?: string;
    expectedHash?: string;
    onProgress?: (progress: DownloadProgress) => void;
  } = {}
): Promise<DownloadResult> {
  // Extract filename from URL or use provided
  const urlPath = new URL(url).pathname;
  const filename = options.filename || path.basename(urlPath) || 'download';
  
  // Determine destination
  const destDir = options.destination || getDestinationPath(filename);
  const destPath = path.join(destDir, filename);
  
  return downloadFile(url, destPath, {
    expectedHash: options.expectedHash,
    onProgress: options.onProgress,
    resume: true
  });
}

/**
 * Get model info without downloading
 */
async function getModelInfo(url: string): Promise<any> {
  if (url.includes('civitai.com')) {
    const parsed = parseCivitAIUrl(url);
    if (!parsed) throw new Error('Invalid CivitAI URL');
    
    const info = await getCivitAIModelInfo(parsed.modelId);
    return {
      source: 'civitai',
      id: info.id,
      name: info.name,
      type: info.type,
      creator: info.creator,
      description: info.description?.substring(0, 500),
      tags: info.tags,
      versions: info.modelVersions?.map(v => ({
        id: v.id,
        name: v.name,
        files: v.files.map(f => ({
          name: f.name,
          size: formatBytes(f.sizeKB * 1024),
          type: f.type
        }))
      }))
    };
  }
  
  if (url.includes('huggingface.co')) {
    const parsed = parseHuggingFaceUrl(url);
    if (!parsed) throw new Error('Invalid HuggingFace URL');
    
    return {
      source: 'huggingface',
      repo: parsed.repo,
      file: parsed.file,
      downloadUrl: parsed.file 
        ? `https://huggingface.co/${parsed.repo}/resolve/main/${parsed.file}`
        : `https://huggingface.co/${parsed.repo}`
    };
  }
  
  return {
    source: 'direct',
    url,
    filename: path.basename(new URL(url).pathname)
  };
}

export async function executeDownloadOperation(args: any): Promise<string> {
  const { operation } = args;

  switch (operation) {
    case 'download': {
      const url = args.url;
      if (!url) throw new Error('url is required');
      
      let result: DownloadResult;
      const progressUpdates: string[] = [];
      
      const onProgress = (p: DownloadProgress) => {
        // Store latest progress for output
        progressUpdates.length = 0;
        progressUpdates.push(`${p.percent}% | ${formatBytes(p.downloadedBytes)}/${formatBytes(p.totalBytes)} | ${p.speed} | ETA: ${p.eta}`);
      };
      
      // Detect source and download
      if (url.includes('civitai.com')) {
        result = await downloadFromCivitAI(url, {
          destination: args.destination,
          onProgress
        });
      } else if (url.includes('huggingface.co')) {
        result = await downloadFromHuggingFace(url, {
          destination: args.destination,
          onProgress
        });
      } else {
        result = await downloadFromUrl(url, {
          filename: args.filename,
          destination: args.destination,
          expectedHash: args.hash,
          onProgress
        });
      }
      
      if (result.success) {
        const output = [
          `✅ Download complete!`,
          ``,
          `File: ${result.filename}`,
          `Path: ${result.path}`,
          `Size: ${formatBytes(result.size || 0)}`,
          `Time: ${formatDuration(result.duration || 0)}`,
          `Speed: ${result.speed}`
        ];
        if (result.hash) {
          output.push(`SHA256: ${result.hash}`);
        }
        return output.join('\n');
      } else {
        throw new Error(result.error || 'Download failed');
      }
    }
    
    case 'info': {
      const url = args.url;
      if (!url) throw new Error('url is required');
      
      const info = await getModelInfo(url);
      
      if (info.source === 'civitai') {
        const output = [
          `=== CivitAI Model Info ===`,
          ``,
          `Name: ${info.name}`,
          `Type: ${info.type}`,
          `Creator: ${info.creator || 'Unknown'}`,
          `Tags: ${info.tags?.join(', ') || 'None'}`,
          ``,
          `Versions:`
        ];
        
        for (const v of (info.versions || []).slice(0, 3)) {
          output.push(`  ${v.name} (ID: ${v.id})`);
          for (const f of v.files) {
            output.push(`    - ${f.name} (${f.size})`);
          }
        }
        
        if (info.description) {
          output.push(``, `Description: ${info.description}...`);
        }
        
        return output.join('\n');
      }
      
      if (info.source === 'huggingface') {
        return [
          `=== HuggingFace Info ===`,
          ``,
          `Repo: ${info.repo}`,
          `File: ${info.file || '(browse repo)'}`,
          `URL: ${info.downloadUrl}`
        ].join('\n');
      }
      
      return [
        `=== Direct URL ===`,
        ``,
        `URL: ${info.url}`,
        `Filename: ${info.filename}`
      ].join('\n');
    }
    
    case 'list-paths': {
      const output = ['=== Model Destination Paths ===', ''];
      for (const [type, path] of Object.entries(MODEL_PATHS)) {
        if (type !== 'default') {
          output.push(`${type}: ${path}`);
        }
      }
      return output.join('\n');
    }
    
    default:
      throw new Error(`Unknown download operation: ${operation}`);
  }
}
