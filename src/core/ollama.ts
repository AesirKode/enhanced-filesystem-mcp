/**
 * Ollama API Client
 * Direct integration with Ollama REST API
 */

export interface OllamaConfig {
  host: string;
  timeout: number;
}

export interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
  details?: {
    family: string;
    parameter_size: string;
    quantization_level: string;
  };
}

export interface OllamaGenerateOptions {
  temperature?: number;
  top_p?: number;
  top_k?: number;
  num_predict?: number;
  stop?: string[];
  seed?: number;
  num_ctx?: number;
}

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaOptions {
  operation: 'list' | 'show' | 'pull' | 'delete' | 'copy' | 'create' | 'generate' | 'chat' | 'embeddings' | 'ps';
  model?: string;
  prompt?: string;
  messages?: OllamaMessage[];
  options?: OllamaGenerateOptions;
  source?: string;
  destination?: string;
  modelfile?: string;
  modelfileContent?: string;
  stream?: boolean;
  config?: Partial<OllamaConfig>;
}

const DEFAULT_CONFIG: OllamaConfig = {
  host: 'http://localhost:11434',
  timeout: 300000, // 5 minutes for large operations
};

export class OllamaClient {
  private config: OllamaConfig;

  constructor(config?: Partial<OllamaConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(`${this.config.host}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Ollama API error (${response.status}): ${error}`);
      }

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return await response.json();
      }
      
      return await response.text();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      throw error;
    }
  }

  /**
   * List all available models
   */
  async list(): Promise<{ models: OllamaModel[] }> {
    const response = await this.request('/api/tags');
    return {
      models: response.models || [],
    };
  }

  /**
   * Show model information
   */
  async show(model: string): Promise<any> {
    return await this.request('/api/show', {
      method: 'POST',
      body: JSON.stringify({ name: model }),
    });
  }

  /**
   * Pull a model (non-streaming, waits for completion)
   */
  async pull(model: string): Promise<{ status: string; model: string }> {
    const response = await fetch(`${this.config.host}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: model, stream: false }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Pull failed: ${error}`);
    }

    // For non-streaming, read the final response
    const result = await response.json() as { status?: string };
    return {
      status: result.status || 'success',
      model,
    };
  }

  /**
   * Delete a model
   */
  async delete(model: string): Promise<{ status: string; deleted: string }> {
    await this.request('/api/delete', {
      method: 'DELETE',
      body: JSON.stringify({ name: model }),
    });
    return { status: 'success', deleted: model };
  }

  /**
   * Copy a model
   */
  async copy(source: string, destination: string): Promise<{ status: string; source: string; destination: string }> {
    await this.request('/api/copy', {
      method: 'POST',
      body: JSON.stringify({ source, destination }),
    });
    return { status: 'success', source, destination };
  }

  /**
   * Create a model from Modelfile
   */
  async create(model: string, modelfile: string): Promise<{ status: string; model: string }> {
    const response = await fetch(`${this.config.host}/api/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: model, modelfile, stream: false }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Create failed: ${error}`);
    }

    const result = await response.json() as { status?: string };
    return {
      status: result.status || 'success',
      model,
    };
  }

  /**
   * Generate completion (non-streaming)
   */
  async generate(model: string, prompt: string, options?: OllamaGenerateOptions): Promise<any> {
    return await this.request('/api/generate', {
      method: 'POST',
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options,
      }),
    });
  }

  /**
   * Chat completion (non-streaming)
   */
  async chat(model: string, messages: OllamaMessage[], options?: OllamaGenerateOptions): Promise<any> {
    return await this.request('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        options,
      }),
    });
  }

  /**
   * Generate embeddings
   */
  async embeddings(model: string, prompt: string): Promise<{ embedding: number[] }> {
    return await this.request('/api/embeddings', {
      method: 'POST',
      body: JSON.stringify({ model, prompt }),
    });
  }

  /**
   * List running models
   */
  async ps(): Promise<{ models: any[] }> {
    return await this.request('/api/ps');
  }
}

// Singleton instance
let clientInstance: OllamaClient | null = null;

export function getOllamaClient(config?: Partial<OllamaConfig>): OllamaClient {
  if (!clientInstance || config) {
    clientInstance = new OllamaClient(config);
  }
  return clientInstance;
}

/**
 * Execute Ollama operation
 */
export async function executeOllamaOperation(options: OllamaOptions): Promise<string> {
  const client = getOllamaClient(options.config);
  const { operation, model, prompt, messages, options: genOptions, source, destination, modelfile, modelfileContent } = options;

  switch (operation) {
    case 'list': {
      const result = await client.list();
      if (result.models.length === 0) {
        return 'No models installed.\n\nRun `ollama_tool({ operation: "pull", model: "llama3:8b" })` to download a model.';
      }
      
      const output: string[] = [];
      output.push(`Ollama Models (${result.models.length}):\n`);
      
      for (const m of result.models) {
        const sizeGB = (m.size / 1e9).toFixed(2);
        const modified = new Date(m.modified_at).toLocaleDateString();
        output.push(`  ${m.name}`);
        output.push(`    Size: ${sizeGB} GB | Modified: ${modified}`);
        if (m.details) {
          output.push(`    Family: ${m.details.family} | Params: ${m.details.parameter_size} | Quant: ${m.details.quantization_level}`);
        }
        output.push('');
      }
      
      return output.join('\n');
    }

    case 'show': {
      if (!model) throw new Error('Model name required');
      const result = await client.show(model);
      
      const output: string[] = [];
      output.push(`Model: ${model}\n`);
      
      if (result.modelfile) {
        output.push('Modelfile:');
        output.push(result.modelfile);
        output.push('');
      }
      
      if (result.parameters) {
        output.push('Parameters:');
        output.push(result.parameters);
        output.push('');
      }
      
      if (result.template) {
        output.push('Template:');
        output.push(result.template);
        output.push('');
      }
      
      if (result.details) {
        output.push('Details:');
        output.push(`  Family: ${result.details.family}`);
        output.push(`  Parameter Size: ${result.details.parameter_size}`);
        output.push(`  Quantization: ${result.details.quantization_level}`);
      }
      
      return output.join('\n');
    }

    case 'pull': {
      if (!model) throw new Error('Model name required');
      const result = await client.pull(model);
      return `✅ Successfully pulled: ${model}\nStatus: ${result.status}`;
    }

    case 'delete': {
      if (!model) throw new Error('Model name required');
      const result = await client.delete(model);
      return `✅ Deleted: ${result.deleted}`;
    }

    case 'copy': {
      if (!source || !destination) throw new Error('Source and destination required');
      const result = await client.copy(source, destination);
      return `✅ Copied: ${result.source} → ${result.destination}`;
    }

    case 'create': {
      if (!model) throw new Error('Model name required');
      if (!modelfile && !modelfileContent) throw new Error('Modelfile or modelfileContent required');
      
      let content = modelfileContent;
      if (modelfile && !modelfileContent) {
        // Read modelfile from disk
        const { promises: fs } = await import('fs');
        content = await fs.readFile(modelfile, 'utf-8');
      }
      
      const result = await client.create(model, content!);
      return `✅ Created model: ${result.model}\nStatus: ${result.status}`;
    }

    case 'generate': {
      if (!model) throw new Error('Model name required');
      if (!prompt) throw new Error('Prompt required');
      
      const result = await client.generate(model, prompt, genOptions);
      
      const output: string[] = [];
      output.push(`Model: ${model}`);
      output.push(`\n${result.response}`);
      output.push(`\n---`);
      output.push(`Tokens: ${result.eval_count || 'N/A'} | Duration: ${((result.total_duration || 0) / 1e9).toFixed(2)}s`);
      
      return output.join('\n');
    }

    case 'chat': {
      if (!model) throw new Error('Model name required');
      if (!messages || messages.length === 0) throw new Error('Messages required');
      
      const result = await client.chat(model, messages, genOptions);
      
      const output: string[] = [];
      output.push(`Model: ${model}`);
      output.push(`\n${result.message?.content || result.response}`);
      output.push(`\n---`);
      output.push(`Tokens: ${result.eval_count || 'N/A'} | Duration: ${((result.total_duration || 0) / 1e9).toFixed(2)}s`);
      
      return output.join('\n');
    }

    case 'embeddings': {
      if (!model) throw new Error('Model name required');
      if (!prompt) throw new Error('Prompt/text required');
      
      const result = await client.embeddings(model, prompt);
      
      const output: string[] = [];
      output.push(`Model: ${model}`);
      output.push(`Dimensions: ${result.embedding.length}`);
      output.push(`\nFirst 10 values: [${result.embedding.slice(0, 10).map(v => v.toFixed(4)).join(', ')}...]`);
      
      return output.join('\n');
    }

    case 'ps': {
      const result = await client.ps();
      
      if (!result.models || result.models.length === 0) {
        return 'No models currently loaded in memory.';
      }
      
      const output: string[] = [];
      output.push(`Running Models (${result.models.length}):\n`);
      
      for (const m of result.models) {
        const sizeGB = ((m.size || 0) / 1e9).toFixed(2);
        const vramGB = ((m.size_vram || 0) / 1e9).toFixed(2);
        output.push(`  ${m.name}`);
        output.push(`    Size: ${sizeGB} GB | VRAM: ${vramGB} GB`);
        if (m.expires_at) {
          output.push(`    Expires: ${new Date(m.expires_at).toLocaleString()}`);
        }
        output.push('');
      }
      
      return output.join('\n');
    }

    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}
