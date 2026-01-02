import { Tool } from '@modelcontextprotocol/sdk/types.js';

export function setupProcessTools(): Tool[] {
  return [
    {
      name: 'efs_exec',
      description: `Execute a shell command and return the output.

Simple command execution - runs any command and returns stdout/stderr.

Parameters:
- command: Command to execute (string)
- cwd: Working directory (optional)
- timeout: Timeout in milliseconds (optional, default: 30000)

Examples:
  efs_exec({ command: "pip list" })
  efs_exec({ command: "dir D:\\Projects", cwd: "D:\\" })
  efs_exec({ command: "python script.py", timeout: 60000 })`,
      inputSchema: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'Command to execute',
          },
          cwd: {
            type: 'string',
            description: 'Working directory (optional)',
          },
          timeout: {
            type: 'number',
            description: 'Timeout in milliseconds (default: 30000)',
          },
        },
        required: ['command'],
      },
    },
    {
      name: 'efs_python',
      description: `Execute Python code and return the output.

Runs Python code directly. Great for quick data analysis, calculations, or file processing.

The code executes in a fresh Python process each time.
For pandas/numpy, import them in your code.

Parameters:
- code: Python code to execute (string)
- cwd: Working directory (optional)
- timeout: Timeout in milliseconds (optional, default: 30000)

Examples:
  efs_python({ code: "print(2 + 2)" })
  efs_python({ code: "import pandas as pd; df = pd.read_csv('data.csv'); print(df.head())" })
  efs_python({ code: "import json; print(json.dumps({'result': 42}))" })`,
      inputSchema: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'Python code to execute',
          },
          cwd: {
            type: 'string',
            description: 'Working directory (optional)',
          },
          timeout: {
            type: 'number',
            description: 'Timeout in milliseconds (default: 30000)',
          },
        },
        required: ['code'],
      },
    },
    {
      name: 'process_tool',
      description: `Process and service manager with GPU monitoring.

Operations:
- 'list': List running processes (with optional name/port filter)
- 'gpu': Get NVIDIA GPU stats and running GPU processes
- 'start': Start a process or service in background
- 'kill': Kill process by PID, name, or port
- 'status': Check status of a predefined service
- 'restart': Restart a predefined service
- 'monitor': Get current stats for a process
- 'wait': Wait for a process to exit

Predefined Services:
- 'ollama': Ollama server (port 11434)
- 'comfyui': ComfyUI server (port 8188)
- 'koboldcpp': KoboldCpp server (port 5001)

Parameters:
- operation: Operation to perform (required)
- service: Service name for start/stop/status/restart
- command: Command to run (for custom start)
- cwd: Working directory
- env: Environment variables
- pid: Process ID (for kill/monitor/wait)
- filter: { name, port, ports } for filtering
- force: Force kill (SIGKILL)
- waitForPort: Wait for port after starting
- timeout: Timeout in ms

Examples:

1. Get GPU stats:
{ operation: 'gpu' }

2. List Python processes:
{ operation: 'list', filter: { name: 'python' } }

3. List processes using port 8188:
{ operation: 'list', filter: { port: 8188 } }

4. Start Ollama service:
{ operation: 'start', service: 'ollama' }

5. Check ComfyUI status:
{ operation: 'status', service: 'comfyui' }

6. Restart Ollama:
{ operation: 'restart', service: 'ollama' }

7. Kill process by PID:
{ operation: 'kill', pid: 1234, force: true }

8. Kill process by port:
{ operation: 'kill', filter: { port: 8188 } }

9. Start custom command:
{ 
  operation: 'start', 
  command: 'python server.py',
  cwd: 'D:/Projects/myapp',
  waitForPort: 5000
}`,
      inputSchema: {
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            enum: ['list', 'gpu', 'start', 'kill', 'monitor', 'wait', 'status', 'restart'],
            description: 'Process operation',
          },
          service: {
            type: 'string',
            enum: ['ollama', 'comfyui', 'koboldcpp'],
            description: 'Predefined service name',
          },
          command: {
            type: 'string',
            description: 'Command to run (for custom start)',
          },
          cwd: {
            type: 'string',
            description: 'Working directory',
          },
          env: {
            type: 'object',
            additionalProperties: { type: 'string' },
            description: 'Environment variables',
          },
          pid: {
            type: 'number',
            description: 'Process ID',
          },
          filter: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Filter by process name' },
              port: { type: 'number', description: 'Filter by port' },
              ports: { type: 'array', items: { type: 'number' }, description: 'Filter by multiple ports' },
            },
            description: 'Process filter options',
          },
          force: {
            type: 'boolean',
            description: 'Force kill (default: false)',
          },
          graceful: {
            type: 'boolean',
            description: 'Graceful restart (default: false)',
          },
          waitForPort: {
            type: 'number',
            description: 'Wait for port after starting',
          },
          timeout: {
            type: 'number',
            description: 'Timeout in milliseconds',
          },
        },
        required: ['operation'],
      },
    },
  ];
}
