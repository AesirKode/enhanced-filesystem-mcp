/**
 * ComfyUI API Client
 * Direct integration with ComfyUI server
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { URL } from 'url';

export interface ComfyUIConfig {
  host: string;
  port: number;
  timeout: number;
}

export interface QueueStatus {
  queue_running: Array<[number, string, any]>;
  queue_pending: Array<[number, string, any]>;
}

export interface SystemStats {
  system: {
    os: string;
    python_version: string;
    pytorch_version: string;
  };
  devices: Array<{
    name: string;
    type: string;
    vram_total: number;
    vram_free: number;
  }>;
}

export interface HistoryEntry {
  prompt: any;
  outputs: Record<string, any>;
  status: {
    completed: boolean;
    messages: string[];
  };
}

export interface WorkflowResult {
  prompt_id: string;
  number: number;
  node_errors?: Record<string, any>;
}

const DEFAULT_CONFIG: ComfyUIConfig = {
  host: 'localhost',
  port: 8188,
  timeout: 300000 // 5 minutes for long generations
};

export class ComfyUIClient {
  private config: ComfyUIConfig;

  constructor(config: Partial<ComfyUIConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const url = new URL(`http://${this.config.host}:${this.config.port}${endpoint}`);
      
      const options: http.RequestOptions = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        timeout: this.config.timeout,
        headers: {
          'Content-Type': 'application/json',
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            if (res.statusCode && res.statusCode >= 400) {
              reject(new Error(`HTTP ${res.statusCode}: ${data}`));
              return;
            }
            // Handle empty responses
            if (!data || data.trim() === '') {
              resolve({} as T);
              return;
            }
            resolve(JSON.parse(data));
          } catch (e) {
            // If not JSON, return as text wrapped in object
            resolve({ text: data } as T);
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }

  /**
   * Get system stats (GPU, memory, etc.)
   */
  async getSystemStats(): Promise<SystemStats> {
    return this.request<SystemStats>('GET', '/system_stats');
  }

  /**
   * Get queue status
   */
  async getQueue(): Promise<QueueStatus> {
    return this.request<QueueStatus>('GET', '/queue');
  }

  /**
   * Queue a workflow for execution
   */
  async queuePrompt(workflow: any, clientId?: string): Promise<WorkflowResult> {
    const body: any = { prompt: workflow };
    if (clientId) {
      body.client_id = clientId;
    }
    return this.request<WorkflowResult>('POST', '/prompt', body);
  }

  /**
   * Get generation history
   */
  async getHistory(promptId?: string, maxItems?: number): Promise<Record<string, HistoryEntry>> {
    let endpoint = '/history';
    if (promptId) {
      endpoint += `/${promptId}`;
    }
    if (maxItems) {
      endpoint += `?max_items=${maxItems}`;
    }
    return this.request<Record<string, HistoryEntry>>('GET', endpoint);
  }

  /**
   * Interrupt current generation
   */
  async interrupt(): Promise<void> {
    await this.request<void>('POST', '/interrupt');
  }

  /**
   * Clear queue
   */
  async clearQueue(): Promise<void> {
    await this.request<void>('POST', '/queue', { clear: true });
  }

  /**
   * Delete history item
   */
  async deleteHistory(promptId: string): Promise<void> {
    await this.request<void>('POST', '/history', { delete: [promptId] });
  }

  /**
   * Clear all history
   */
  async clearHistory(): Promise<void> {
    await this.request<void>('POST', '/history', { clear: true });
  }

  /**
   * Get object info (available nodes)
   */
  async getObjectInfo(nodeClass?: string): Promise<any> {
    const endpoint = nodeClass ? `/object_info/${nodeClass}` : '/object_info';
    return this.request<any>('GET', endpoint);
  }

  /**
   * Get embeddings list
   */
  async getEmbeddings(): Promise<string[]> {
    return this.request<string[]>('GET', '/embeddings');
  }

  /**
   * Get extensions list
   */
  async getExtensions(): Promise<string[]> {
    return this.request<string[]>('GET', '/extensions');
  }

  /**
   * Upload an image
   */
  async uploadImage(
    imagePath: string,
    _subfolder?: string,
    _overwrite: boolean = false
  ): Promise<{ name: string; subfolder: string; type: string }> {
    return new Promise((resolve, reject) => {
      const filename = path.basename(imagePath);
      const imageData = fs.readFileSync(imagePath);
      
      const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
      
      let body = '';
      body += `--${boundary}\r\n`;
      body += `Content-Disposition: form-data; name="image"; filename="${filename}"\r\n`;
      body += 'Content-Type: application/octet-stream\r\n\r\n';
      
      const bodyStart = Buffer.from(body, 'utf-8');
      const bodyEnd = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8');
      const fullBody = Buffer.concat([bodyStart, imageData, bodyEnd]);

      const options: http.RequestOptions = {
        hostname: this.config.host,
        port: this.config.port,
        path: '/upload/image',
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': fullBody.length
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Failed to parse response: ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.write(fullBody);
      req.end();
    });
  }

  /**
   * Get an output image
   */
  async getImage(
    filename: string,
    subfolder: string = '',
    folderType: string = 'output'
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const params = new URLSearchParams({
        filename,
        subfolder,
        type: folderType
      });

      const options: http.RequestOptions = {
        hostname: this.config.host,
        port: this.config.port,
        path: `/view?${params.toString()}`,
        method: 'GET'
      };

      const req = http.request(options, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      });

      req.on('error', reject);
      req.end();
    });
  }

  /**
   * Save output image to file
   */
  async saveImage(
    filename: string,
    outputPath: string,
    subfolder: string = '',
    folderType: string = 'output'
  ): Promise<string> {
    const imageData = await this.getImage(filename, subfolder, folderType);
    fs.writeFileSync(outputPath, imageData);
    return outputPath;
  }

  /**
   * Check if ComfyUI is running
   */
  async isRunning(): Promise<boolean> {
    try {
      await this.getSystemStats();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Wait for a prompt to complete
   */
  async waitForPrompt(
    promptId: string,
    pollInterval: number = 1000,
    timeout: number = 300000
  ): Promise<HistoryEntry> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const history = await this.getHistory(promptId);
      if (history[promptId]) {
        const entry = history[promptId];
        if (entry.status?.completed) {
          return entry;
        }
      }
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
    
    throw new Error(`Timeout waiting for prompt ${promptId}`);
  }

  /**
   * Get list of output images from a completed prompt
   */
  async getOutputImages(promptId: string): Promise<Array<{ filename: string; subfolder: string }>> {
    const history = await this.getHistory(promptId);
    const entry = history[promptId];
    if (!entry) {
      throw new Error(`Prompt ${promptId} not found in history`);
    }

    const images: Array<{ filename: string; subfolder: string }> = [];
    
    for (const nodeOutput of Object.values(entry.outputs)) {
      if (nodeOutput.images) {
        for (const img of nodeOutput.images) {
          images.push({
            filename: img.filename,
            subfolder: img.subfolder || ''
          });
        }
      }
    }
    
    return images;
  }
}

// Singleton instance
let clientInstance: ComfyUIClient | null = null;

export function getComfyUIClient(config?: Partial<ComfyUIConfig>): ComfyUIClient {
  if (!clientInstance || config) {
    clientInstance = new ComfyUIClient(config);
  }
  return clientInstance;
}
