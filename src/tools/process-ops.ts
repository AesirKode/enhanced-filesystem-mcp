import { Tool } from '@modelcontextprotocol/sdk/types.js';

export function setupProcessTools(): Tool[] {
  return [
    {
      name: 'efs_exec',
      description: "Execute a shell command and return stdout/stderr. Parameters: command (required), cwd (optional), timeout ms (default 30000).",
      inputSchema: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Command to execute' },
          cwd: { type: 'string', description: 'Working directory (optional)' },
          timeout: { type: 'number', description: 'Timeout in milliseconds (default: 30000)' },
        },
        required: ['command'],
      },
    },
    {
      name: 'efs_python',
      description: "Execute Python code. Supports persistent named sessions (variables kept between calls). Parameters: code (required), sessionId, cwd, timeout, restart.",
      inputSchema: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Python code to execute' },
          sessionId: { type: 'string', description: 'Session ID for persistent state (optional)' },
          cwd: { type: 'string', description: 'Working directory (optional)' },
          timeout: { type: 'number', description: 'Timeout in milliseconds (default: 30000)' },
          restart: { type: 'boolean', description: 'Restart the session (default: false)' },
        },
        required: ['code'],
      },
    },
    {
      name: 'process_tool',
      description: "Process and service manager with GPU monitoring. Operations: list (filter by name/port), gpu (NVIDIA stats), start (service or custom command), kill (by PID/name/port), status, restart, monitor, wait. Predefined services: ollama (11434), comfyui (8188), koboldcpp (5001).",
      inputSchema: {
        type: 'object',
        properties: {
          operation: { type: 'string', enum: ['list', 'gpu', 'start', 'kill', 'monitor', 'wait', 'status', 'restart'], description: 'Process operation' },
          service: { type: 'string', enum: ['ollama', 'comfyui', 'koboldcpp'], description: 'Predefined service name' },
          command: { type: 'string', description: 'Command to run (for custom start)' },
          cwd: { type: 'string', description: 'Working directory' },
          env: { type: 'object', additionalProperties: { type: 'string' }, description: 'Environment variables' },
          pid: { type: 'number', description: 'Process ID' },
          filter: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Filter by process name' },
              port: { type: 'number', description: 'Filter by port' },
              ports: { type: 'array', items: { type: 'number' }, description: 'Filter by multiple ports' },
            },
            description: 'Process filter options',
          },
          force: { type: 'boolean', description: 'Force kill (default: false)' },
          graceful: { type: 'boolean', description: 'Graceful restart (default: false)' },
          waitForPort: { type: 'number', description: 'Wait for port after starting' },
          timeout: { type: 'number', description: 'Timeout in milliseconds' },
        },
        required: ['operation'],
      },
    },
  ];
}
