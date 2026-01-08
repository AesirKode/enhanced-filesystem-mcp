/**
 * ComfyUI Tool Definition
 * Operations: status, queue, history, interrupt, clear, upload, download, nodes, wait,
 *             models, free, embeddings, metadata, jobs, templates, mask, preview
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const comfyuiTool: Tool = {
  name: "comfyui_tool",
  description: `ComfyUI workflow management and image generation control.

Operations:
- 'status': Get system stats (GPU, VRAM, queue status, version)
- 'queue': Queue a workflow for generation
- 'history': Get generation history
- 'interrupt': Stop current generation (optionally by prompt_id)
- 'clear': Clear queue or history
- 'upload': Upload an image to ComfyUI
- 'download': Download output image to local path
- 'nodes': Get available node types
- 'wait': Wait for a prompt to complete and get results
- 'models': List available models (checkpoints, loras, vae, etc.)
- 'free': Unload models and free VRAM
- 'embeddings': List available embeddings
- 'metadata': Get safetensors file metadata
- 'jobs': Query jobs with filtering and pagination
- 'templates': Get workflow templates from custom nodes
- 'mask': Upload a mask for inpainting
- 'preview': Get thumbnail preview of an image
- 'features': Get server feature flags
- 'agent': NATURAL LANGUAGE image generation - describe what you want, LLM interprets and generates

Examples:

1. Check status:
{ operation: 'status' }

2. Queue workflow from file:
{ operation: 'queue', workflowPath: 'D:/workflows/my_workflow.json' }

3. Queue workflow inline:
{ operation: 'queue', workflow: { "3": { "class_type": "KSampler", ... } } }

4. Get recent history:
{ operation: 'history', maxItems: 10 }

5. Get specific prompt result:
{ operation: 'history', promptId: 'abc123' }

6. Interrupt current generation:
{ operation: 'interrupt' }

7. Interrupt specific prompt:
{ operation: 'interrupt', promptId: 'abc123' }

8. Clear queue:
{ operation: 'clear', target: 'queue' }

9. Clear history:
{ operation: 'clear', target: 'history' }

10. Upload image:
{ operation: 'upload', imagePath: 'D:/images/input.png' }

11. Upload to specific folder:
{ operation: 'upload', imagePath: 'D:/images/input.png', subfolder: 'my_images', uploadType: 'input' }

12. Download output:
{ operation: 'download', filename: 'ComfyUI_00001.png', outputPath: 'D:/outputs/result.png' }

13. Get node info:
{ operation: 'nodes' }
{ operation: 'nodes', nodeClass: 'KSampler' }

14. Queue and wait for result:
{ operation: 'wait', workflowPath: 'D:/workflow.json', timeout: 120000 }

15. List model types:
{ operation: 'models' }

16. List checkpoints:
{ operation: 'models', modelFolder: 'checkpoints' }

17. List LoRAs:
{ operation: 'models', modelFolder: 'loras' }

18. Free VRAM:
{ operation: 'free' }
{ operation: 'free', unloadModels: true, freeMemory: true }

19. List embeddings:
{ operation: 'embeddings' }

20. Get model metadata:
{ operation: 'metadata', modelFolder: 'checkpoints', modelFile: 'sd_xl_base_1.0.safetensors' }

21. Get jobs with filtering:
{ operation: 'jobs' }
{ operation: 'jobs', jobStatus: 'completed', jobLimit: 10 }
{ operation: 'jobs', jobId: 'abc123' }

22. Get workflow templates:
{ operation: 'templates' }

23. Upload mask for inpainting:
{ operation: 'mask', maskPath: 'D:/mask.png', originalRef: { filename: 'base.png', type: 'input' } }

24. Get image preview:
{ operation: 'preview', filename: 'ComfyUI_00001.png', previewFormat: 'webp', previewQuality: 80 }

25. Get server features:
{ operation: 'features' }

26. Agent - Natural language generation (uses uncensored LLM):
{ operation: 'agent', agentRequest: 'a beautiful sunset over mountains with dramatic clouds' }

27. Agent with options:
{ 
  operation: 'agent', 
  agentRequest: 'cyberpunk cityscape with neon lights and rain',
  agentWait: true,
  agentOutputDir: 'D:/outputs',
  width: 1024,
  height: 1024
}

28. Agent with custom LLM:
{
  operation: 'agent',
  agentRequest: 'NSFW content request here',
  agentConfig: { 
    llmBackend: 'ollama', 
    llmModel: 'dolphin-mistral-nemo',
    llmHost: 'localhost',
    llmPort: 11434
  }
}`,

  inputSchema: {
    type: "object" as const,
    properties: {
      operation: {
        type: "string",
        enum: [
          "status", "queue", "history", "interrupt", "clear", "upload", "download",
          "nodes", "wait", "models", "free", "embeddings", "metadata", "jobs",
          "templates", "mask", "preview", "features", "agent"
        ],
        description: "ComfyUI operation to perform"
      },
      // Queue/Wait operations
      workflow: {
        type: "object",
        description: "Workflow JSON object (for queue operation)"
      },
      workflowPath: {
        type: "string",
        description: "Path to workflow JSON file (for queue/wait operation)"
      },
      // History operations
      promptId: {
        type: "string",
        description: "Prompt ID (for history lookup, interrupt, delete)"
      },
      maxItems: {
        type: "number",
        description: "Max history items to return (default: 10)"
      },
      // Clear operations
      target: {
        type: "string",
        enum: ["queue", "history"],
        description: "Target to clear (for clear operation)"
      },
      // Upload operations
      imagePath: {
        type: "string",
        description: "Path to image file (for upload)"
      },
      maskPath: {
        type: "string",
        description: "Path to mask file (for mask upload)"
      },
      originalRef: {
        type: "object",
        description: "Original image reference for mask upload: { filename, subfolder?, type? }",
        properties: {
          filename: { type: "string" },
          subfolder: { type: "string" },
          type: { type: "string" }
        }
      },
      subfolder: {
        type: "string",
        description: "Subfolder for upload/download operations"
      },
      uploadType: {
        type: "string",
        enum: ["input", "temp", "output"],
        description: "Upload destination type (default: input)"
      },
      overwrite: {
        type: "boolean",
        description: "Overwrite existing file on upload (default: false)"
      },
      // Download operations
      filename: {
        type: "string",
        description: "Output filename (for download/preview)"
      },
      outputPath: {
        type: "string",
        description: "Local path to save image (for download)"
      },
      folderType: {
        type: "string",
        enum: ["input", "temp", "output"],
        description: "Source folder type for download (default: output)"
      },
      // Preview operations
      previewFormat: {
        type: "string",
        enum: ["webp", "jpeg"],
        description: "Preview image format (default: webp)"
      },
      previewQuality: {
        type: "number",
        description: "Preview image quality 1-100 (default: 90)"
      },
      // Node operations
      nodeClass: {
        type: "string",
        description: "Specific node class to get info for"
      },
      // Wait operations
      timeout: {
        type: "number",
        description: "Timeout in ms for wait operation (default: 300000)"
      },
      // Model operations
      modelFolder: {
        type: "string",
        description: "Model folder: checkpoints, loras, vae, controlnet, embeddings, upscale_models, etc."
      },
      modelFile: {
        type: "string",
        description: "Model filename for metadata lookup (must be .safetensors)"
      },
      // Free operations
      unloadModels: {
        type: "boolean",
        description: "Unload models from VRAM (default: true)"
      },
      freeMemory: {
        type: "boolean",
        description: "Free cached memory (default: true)"
      },
      // Jobs operations
      jobId: {
        type: "string",
        description: "Specific job ID to fetch"
      },
      jobStatus: {
        type: "string",
        description: "Filter jobs by status: pending, in_progress, completed, failed (comma-separated)"
      },
      jobSortBy: {
        type: "string",
        enum: ["created_at", "execution_duration"],
        description: "Sort jobs by field (default: created_at)"
      },
      jobSortOrder: {
        type: "string",
        enum: ["asc", "desc"],
        description: "Sort order (default: desc)"
      },
      jobLimit: {
        type: "number",
        description: "Max jobs to return"
      },
      jobOffset: {
        type: "number",
        description: "Jobs pagination offset"
      },
      // Config
      config: {
        type: "object",
        description: "Optional ComfyUI connection config",
        properties: {
          host: { type: "string", description: "ComfyUI host (default: localhost)" },
          port: { type: "number", description: "ComfyUI port (default: 8188)" }
        }
      },
      // Agent operations
      agentRequest: {
        type: "string",
        description: "Natural language description of what image to generate (for agent operation)"
      },
      agentWait: {
        type: "boolean",
        description: "Wait for generation to complete (default: false)"
      },
      agentOutputDir: {
        type: "string",
        description: "Directory to save output images (if agentWait is true)"
      },
      agentConfig: {
        type: "object",
        description: "LLM configuration for agent",
        properties: {
          llmBackend: { 
            type: "string", 
            enum: ["ollama", "koboldcpp"],
            description: "LLM backend (default: ollama)" 
          },
          llmHost: { type: "string", description: "LLM host (default: localhost)" },
          llmPort: { type: "number", description: "LLM port (default: 11434 for Ollama, 5001 for KoboldCpp)" },
          llmModel: { type: "string", description: "LLM model name (default: dolphin-mistral)" }
        }
      },
      // Agent overrides (can also be used with agent operation)
      width: {
        type: "number",
        description: "Image width (for agent operation, overrides LLM suggestion)"
      },
      height: {
        type: "number",
        description: "Image height (for agent operation, overrides LLM suggestion)"
      },
      steps: {
        type: "number",
        description: "Sampling steps (for agent operation)"
      },
      cfgScale: {
        type: "number",
        description: "CFG scale (for agent operation)"
      },
      checkpoint: {
        type: "string",
        description: "Checkpoint name (for agent operation)"
      }
    },
    required: ["operation"]
  }
};

export interface ComfyUIToolArgs {
  operation: 'status' | 'queue' | 'history' | 'interrupt' | 'clear' | 'upload' | 'download' |
             'nodes' | 'wait' | 'models' | 'free' | 'embeddings' | 'metadata' | 'jobs' |
             'templates' | 'mask' | 'preview' | 'features' | 'agent';
  // Queue/Wait
  workflow?: any;
  workflowPath?: string;
  // History
  promptId?: string;
  maxItems?: number;
  // Clear
  target?: 'queue' | 'history';
  // Upload
  imagePath?: string;
  maskPath?: string;
  originalRef?: { filename: string; subfolder?: string; type?: string };
  subfolder?: string;
  uploadType?: 'input' | 'temp' | 'output';
  overwrite?: boolean;
  // Download
  filename?: string;
  outputPath?: string;
  folderType?: 'input' | 'temp' | 'output';
  // Preview
  previewFormat?: 'webp' | 'jpeg';
  previewQuality?: number;
  // Nodes
  nodeClass?: string;
  // Wait
  timeout?: number;
  // Models
  modelFolder?: string;
  modelFile?: string;
  // Free
  unloadModels?: boolean;
  freeMemory?: boolean;
  // Jobs
  jobId?: string;
  jobStatus?: string;
  jobSortBy?: 'created_at' | 'execution_duration';
  jobSortOrder?: 'asc' | 'desc';
  jobLimit?: number;
  jobOffset?: number;
  // Config
  config?: {
    host?: string;
    port?: number;
  };
  // Agent operations
  agentRequest?: string;
  agentWait?: boolean;
  agentOutputDir?: string;
  agentConfig?: {
    llmBackend?: 'ollama' | 'koboldcpp';
    llmHost?: string;
    llmPort?: number;
    llmModel?: string;
  };
  // Agent overrides
  width?: number;
  height?: number;
  steps?: number;
  cfgScale?: number;
  checkpoint?: string;
}
