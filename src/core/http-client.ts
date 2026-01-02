/**
 * HTTP Client for API requests
 * Supports REST APIs, file downloads, streaming
 */

import { promises as fs } from 'fs';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import * as path from 'path';

export interface HttpAuth {
  type: 'bearer' | 'basic';
  token?: string;
  username?: string;
  password?: string;
}

export interface HttpRetry {
  count: number;
  delay: number;
  backoff?: number;
}

export interface HttpOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';
  url: string;
  headers?: Record<string, string>;
  body?: any;
  formData?: Record<string, any>;
  auth?: HttpAuth;
  timeout?: number;
  retry?: HttpRetry;
  download?: string;
  followRedirects?: boolean;
}

export interface HttpResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: any;
  timing: {
    total: number;
  };
  downloaded?: boolean;
  path?: string;
  size?: number;
}

const DEFAULT_TIMEOUT = 30000; // 30 seconds

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function executeHttpRequest(options: HttpOptions): Promise<HttpResponse> {
  const {
    method,
    url,
    headers = {},
    body,
    auth,
    timeout = DEFAULT_TIMEOUT,
    retry,
    download,
  } = options;

  // Build headers
  const requestHeaders: Record<string, string> = {
    ...headers,
  };

  // Add auth
  if (auth) {
    if (auth.type === 'bearer' && auth.token) {
      requestHeaders['Authorization'] = `Bearer ${auth.token}`;
    } else if (auth.type === 'basic' && auth.username && auth.password) {
      const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
      requestHeaders['Authorization'] = `Basic ${credentials}`;
    }
  }

  // Build request options
  const requestInit: RequestInit = {
    method,
    headers: requestHeaders,
  };

  // Add body
  if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
    if (typeof body === 'object') {
      requestInit.body = JSON.stringify(body);
      if (!requestHeaders['Content-Type']) {
        requestHeaders['Content-Type'] = 'application/json';
      }
    } else {
      requestInit.body = body;
    }
  }

  // Retry logic
  const maxAttempts = retry?.count || 1;
  let lastError: Error | null = null;
  let delay = retry?.delay || 1000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...requestInit,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const endTime = Date.now();

      // Convert headers to object
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      // Handle download
      if (download && response.ok) {
        const dir = path.dirname(download);
        await fs.mkdir(dir, { recursive: true });

        const fileStream = createWriteStream(download);
        
        // @ts-ignore - Response.body is a ReadableStream in Node 18+
        if (response.body) {
          await pipeline(Readable.fromWeb(response.body as any), fileStream);
        }

        const stats = await fs.stat(download);

        return {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
          body: null,
          timing: { total: endTime - startTime },
          downloaded: true,
          path: download,
          size: stats.size,
        };
      }

      // Parse response body
      let responseBody: any;
      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        responseBody = await response.json();
      } else {
        responseBody = await response.text();
      }

      return {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: responseBody,
        timing: { total: endTime - startTime },
      };

    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on certain errors
      if (lastError.name === 'AbortError') {
        throw new Error(`Request timed out after ${timeout}ms`);
      }

      // Retry if we have attempts left
      if (attempt < maxAttempts) {
        await sleep(delay);
        delay *= retry?.backoff || 1;
        continue;
      }

      throw lastError;
    }
  }

  throw lastError || new Error('Request failed');
}

/**
 * Format HTTP response for display
 */
export function formatHttpResponse(response: HttpResponse): string {
  const output: string[] = [];

  output.push(`Status: ${response.status} ${response.statusText}`);
  output.push(`Time: ${response.timing.total}ms`);

  if (response.downloaded) {
    output.push(`\n✅ Downloaded to: ${response.path}`);
    output.push(`Size: ${((response.size || 0) / 1024 / 1024).toFixed(2)} MB`);
    return output.join('\n');
  }

  // Show relevant headers
  const importantHeaders = ['content-type', 'content-length', 'date', 'server'];
  const headerLines: string[] = [];
  
  for (const [key, value] of Object.entries(response.headers)) {
    if (importantHeaders.includes(key.toLowerCase())) {
      headerLines.push(`  ${key}: ${value}`);
    }
  }
  
  if (headerLines.length > 0) {
    output.push('\nHeaders:');
    output.push(...headerLines);
  }

  // Show body
  if (response.body !== null && response.body !== undefined) {
    output.push('\nBody:');
    if (typeof response.body === 'object') {
      const jsonStr = JSON.stringify(response.body, null, 2);
      // Truncate very long responses
      if (jsonStr.length > 5000) {
        output.push(jsonStr.substring(0, 5000) + '\n... (truncated)');
      } else {
        output.push(jsonStr);
      }
    } else {
      const bodyStr = String(response.body);
      if (bodyStr.length > 5000) {
        output.push(bodyStr.substring(0, 5000) + '\n... (truncated)');
      } else {
        output.push(bodyStr);
      }
    }
  }

  return output.join('\n');
}
