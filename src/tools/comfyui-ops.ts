/**
 * ComfyUI Tool Definition
 * Operations: status, queue, history, interrupt, clear, upload, download, nodes, wait
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const comfyuiTool: Tool = {
  name: "comfyui_tool",
  description: `ComfyUI workflow management and image generation control.

Operations:
- 'status': Get system stats (GPU, VRAM, queue status)
- 'queue': Queue a workflow for generation
- 'history': Get generation history
- 'interrupt': Stop current generation
- 'clear': Clear queue or history
- 'upload': Upload an image to ComfyUI
- 'download': Download output image to local path
- 'nodes': Get available node types
- 'wait': Wait for a prompt to complete and get results

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

7. Clear queue:
{ operation: 'clear', target: 'queue' }

8. Clear history:
{ operation: 'clear', target: 'history' }

9. Upload image:
{ operation: 'upload', imagePath: 'D:/images/input.png' }

10. Download output:
{ operation: 'download', filename: 'ComfyUI_00001.png', outputPath: 'D:/outputs/result.png' }

11. Get node info:
{ operation: 'nodes' }
{ operation: 'nodes', nodeClass: 'KSampler' }

12. Queue and wait for result:
{ operation: 'wait', workflowPath: 'D:/workflow.json', timeout: 120000 }`,

  inputSchema: {
    type: "object" as const,
    properties: {
      operation: {
        type: "string",
        enum: ["status", "queue", "history", "interrupt", "clear", "upload", "download", "nodes", "wait"],
        description: "ComfyUI operation to perform"
      },
      workflow: {
        type: "object",
        description: "Workflow JSON object (for queue operation)"
      },
      workflowPath: {
        type: "string",
        description: "Path to workflow JSON file (for queue/wait operation)"
      },
      promptId: {
        type: "string",
        description: "Prompt ID (for history lookup)"
      },
      maxItems: {
        type: "number",
        description: "Max history items to return (default: 10)"
      },
      target: {
        type: "string",
        enum: ["queue", "history"],
        description: "Target to clear (for clear operation)"
      },
      imagePath: {
        type: "string",
        description: "Path to image file (for upload)"
      },
      filename: {
        type: "string",
        description: "Output filename (for download)"
      },
      subfolder: {
        type: "string",
        description: "Subfolder in ComfyUI output (for download)"
      },
      outputPath: {
        type: "string",
        description: "Local path to save image (for download)"
      },
      nodeClass: {
        type: "string",
        description: "Specific node class to get info for"
      },
      timeout: {
        type: "number",
        description: "Timeout in ms for wait operation (default: 300000)"
      },
      config: {
        type: "object",
        description: "Optional ComfyUI connection config",
        properties: {
          host: { type: "string", description: "ComfyUI host (default: localhost)" },
          port: { type: "number", description: "ComfyUI port (default: 8188)" }
        }
      }
    },
    required: ["operation"]
  }
};

export interface ComfyUIToolArgs {
  operation: 'status' | 'queue' | 'history' | 'interrupt' | 'clear' | 'upload' | 'download' | 'nodes' | 'wait';
  workflow?: any;
  workflowPath?: string;
  promptId?: string;
  maxItems?: number;
  target?: 'queue' | 'history';
  imagePath?: string;
  filename?: string;
  subfolder?: string;
  outputPath?: string;
  nodeClass?: string;
  timeout?: number;
  config?: {
    host?: string;
    port?: number;
  };
}
