/**
 * Process Manager with GPU monitoring and service profiles
 * Start/stop/monitor processes and AI services
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ServiceProfile {
  name: string;
  command: string;
  cwd?: string;
  port?: number;
  healthCheck?: string;
  env?: Record<string, string>;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  cpu?: number;
  memory?: number;
  memoryPercent?: number;
  status?: string;
  user?: string;
  cmdline?: string;
}

export interface GpuInfo {
  name: string;
  driver?: string;
  memory: {
    total: number;
    used: number;
    free: number;
  };
  utilization?: number;
  temperature?: number;
  power?: number;
}

export interface GpuProcess {
  pid: number;
  name: string;
  gpu_memory: number;
  type?: string;
}

export interface ProcessOptions {
  operation: 'list' | 'gpu' | 'start' | 'kill' | 'monitor' | 'wait' | 'status' | 'restart';
  filter?: {
    name?: string;
    port?: number;
    ports?: number[];
  };
  pid?: number;
  command?: string;
  cwd?: string;
  env?: Record<string, string>;
  background?: boolean;
  logFile?: string;
  waitForPort?: number;
  timeout?: number;
  service?: string;
  force?: boolean;
  graceful?: boolean;
  duration?: number;
  interval?: number;
}

// Predefined service profiles
const SERVICE_PROFILES: Record<string, ServiceProfile> = {
  ollama: {
    name: 'ollama',
    command: 'ollama serve',
    port: 11434,
    healthCheck: 'http://localhost:11434/api/version',
  },
  comfyui: {
    name: 'comfyui',
    command: 'python main.py --listen --port 8188',
    cwd: 'D:/Projects/ComfyUI',
    port: 8188,
    healthCheck: 'http://localhost:8188/system_stats',
  },
  koboldcpp: {
    name: 'koboldcpp',
    command: 'koboldcpp.exe',
    cwd: 'D:/Tools/koboldcpp',
    port: 5001,
    healthCheck: 'http://localhost:5001/api/v1/model',
  },
};

/**
 * Get GPU information using nvidia-smi
 */
async function getGpuInfo(): Promise<{ gpu: GpuInfo; processes: GpuProcess[] }> {
  try {
    // Get GPU stats
    const { stdout: gpuStats } = await execAsync(
      'nvidia-smi --query-gpu=name,driver_version,memory.total,memory.used,memory.free,utilization.gpu,temperature.gpu,power.draw --format=csv,noheader,nounits'
    );

    const parts = gpuStats.trim().split(', ');
    
    const gpu: GpuInfo = {
      name: parts[0] || 'Unknown GPU',
      driver: parts[1],
      memory: {
        total: parseInt(parts[2] || '0') * 1024 * 1024, // Convert MB to bytes
        used: parseInt(parts[3] || '0') * 1024 * 1024,
        free: parseInt(parts[4] || '0') * 1024 * 1024,
      },
      utilization: parseInt(parts[5] || '0'),
      temperature: parseInt(parts[6] || '0'),
      power: parseFloat(parts[7] || '0'),
    };

    // Get GPU processes
    const { stdout: processStats } = await execAsync(
      'nvidia-smi --query-compute-apps=pid,name,used_gpu_memory --format=csv,noheader,nounits'
    );

    const processes: GpuProcess[] = [];
    
    if (processStats.trim()) {
      const lines = processStats.trim().split('\n');
      for (const line of lines) {
        const [pidStr, name, memStr] = line.split(', ');
        if (pidStr && name) {
          processes.push({
            pid: parseInt(pidStr),
            name: name.trim(),
            gpu_memory: parseInt(memStr || '0') * 1024 * 1024,
            type: 'C', // Compute
          });
        }
      }
    }

    return { gpu, processes };
  } catch (error) {
    throw new Error(`Failed to get GPU info: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * List running processes
 */
async function listProcesses(filter?: { name?: string; port?: number; ports?: number[] }): Promise<ProcessInfo[]> {
  try {
    // Use tasklist on Windows
    const { stdout } = await execAsync('tasklist /FO CSV /NH');
    
    const processes: ProcessInfo[] = [];
    const lines = stdout.trim().split('\n');
    
    for (const line of lines) {
      const match = line.match(/"([^"]+)","(\d+)","([^"]+)","([^"]+)","([^"]+)"/);
      if (match) {
        const [, name, pidStr, , , memStr] = match;
        const pid = parseInt(pidStr);
        const memory = parseInt(memStr.replace(/[^0-9]/g, '')) * 1024; // KB to bytes
        
        // Apply name filter
        if (filter?.name && !name.toLowerCase().includes(filter.name.toLowerCase())) {
          continue;
        }
        
        processes.push({
          pid,
          name,
          memory,
          status: 'running',
        });
      }
    }

    // Apply port filter if specified
    if (filter?.port || filter?.ports) {
      const targetPorts = filter.ports || (filter.port ? [filter.port] : []);
      const { stdout: netstat } = await execAsync('netstat -ano');
      
      const portPids = new Set<number>();
      const lines = netstat.split('\n');
      
      for (const line of lines) {
        for (const port of targetPorts) {
          if (line.includes(`:${port} `)) {
            const pidMatch = line.match(/\s+(\d+)\s*$/);
            if (pidMatch) {
              portPids.add(parseInt(pidMatch[1]));
            }
          }
        }
      }
      
      return processes.filter(p => portPids.has(p.pid));
    }

    return processes;
  } catch (error) {
    throw new Error(`Failed to list processes: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Kill a process
 */
async function killProcess(options: { pid?: number; name?: string; port?: number; force?: boolean }): Promise<number[]> {
  const { pid, name, port, force = false } = options;
  const killed: number[] = [];

  try {
    if (pid) {
      const forceFlag = force ? '/F' : '';
      await execAsync(`taskkill ${forceFlag} /PID ${pid}`);
      killed.push(pid);
    } else if (name) {
      const forceFlag = force ? '/F' : '';
      await execAsync(`taskkill ${forceFlag} /IM "${name}"`);
      // Can't easily get PIDs from taskkill by name
      killed.push(-1); // Indicate success without specific PID
    } else if (port) {
      // Find process using port
      const procs = await listProcesses({ port });
      for (const proc of procs) {
        const forceFlag = force ? '/F' : '';
        await execAsync(`taskkill ${forceFlag} /PID ${proc.pid}`);
        killed.push(proc.pid);
      }
    }

    return killed;
  } catch (error) {
    throw new Error(`Failed to kill process: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Start a process in background
 */
async function startProcess(options: {
  command: string;
  cwd?: string;
  env?: Record<string, string>;
  waitForPort?: number;
  timeout?: number;
}): Promise<{ pid: number; status: string; port?: number }> {
  const { command, cwd, env, waitForPort, timeout = 30000 } = options;

  return new Promise((resolve, reject) => {
    const parts = command.split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);

    const child = spawn(cmd, args, {
      cwd,
      env: { ...process.env, ...env },
      detached: true,
      stdio: 'ignore',
      shell: true,
    });

    child.unref();

    if (!child.pid) {
      reject(new Error('Failed to start process'));
      return;
    }

    const pid = child.pid;

    if (waitForPort) {
      // Poll for port to be listening
      const startTime = Date.now();
      const checkPort = async (): Promise<void> => {
        try {
          const response = await fetch(`http://localhost:${waitForPort}/`);
          if (response.ok || response.status < 500) {
            resolve({ pid, status: 'started', port: waitForPort });
            return;
          }
        } catch {
          // Port not ready yet
        }

        if (Date.now() - startTime > timeout) {
          resolve({ pid, status: 'started (port not confirmed)', port: waitForPort });
          return;
        }

        setTimeout(checkPort, 500);
      };

      checkPort();
    } else {
      resolve({ pid, status: 'started' });
    }
  });
}

/**
 * Check service status
 */
async function checkServiceStatus(service: string): Promise<{
  service: string;
  running: boolean;
  pid?: number;
  port?: number;
  health?: string;
}> {
  const profile = SERVICE_PROFILES[service];
  if (!profile) {
    throw new Error(`Unknown service: ${service}. Available: ${Object.keys(SERVICE_PROFILES).join(', ')}`);
  }

  const result: { service: string; running: boolean; pid?: number; port?: number; health?: string } = {
    service,
    running: false,
    port: profile.port,
  };

  // Check if port is in use
  if (profile.port) {
    const procs = await listProcesses({ port: profile.port });
    if (procs.length > 0) {
      result.running = true;
      result.pid = procs[0].pid;
    }
  }

  // Check health endpoint
  if (result.running && profile.healthCheck) {
    try {
      const response = await fetch(profile.healthCheck);
      result.health = response.ok ? 'healthy' : `unhealthy (${response.status})`;
    } catch {
      result.health = 'unreachable';
    }
  }

  return result;
}

/**
 * Execute process operation
 */
export async function executeProcessOperation(options: ProcessOptions): Promise<string> {
  const { operation } = options;

  switch (operation) {
    case 'list': {
      const processes = await listProcesses(options.filter);
      
      if (processes.length === 0) {
        return 'No matching processes found.';
      }

      const output: string[] = [];
      output.push(`Processes (${processes.length}):\n`);
      
      for (const proc of processes.slice(0, 50)) { // Limit to 50
        const memMB = ((proc.memory || 0) / 1024 / 1024).toFixed(1);
        output.push(`  PID ${proc.pid}: ${proc.name}`);
        output.push(`    Memory: ${memMB} MB`);
      }
      
      if (processes.length > 50) {
        output.push(`\n... and ${processes.length - 50} more`);
      }
      
      return output.join('\n');
    }

    case 'gpu': {
      const { gpu, processes } = await getGpuInfo();
      
      const output: string[] = [];
      output.push(`GPU: ${gpu.name}`);
      output.push(`Driver: ${gpu.driver || 'N/A'}`);
      output.push('');
      output.push('Memory:');
      output.push(`  Total: ${(gpu.memory.total / 1e9).toFixed(2)} GB`);
      output.push(`  Used:  ${(gpu.memory.used / 1e9).toFixed(2)} GB`);
      output.push(`  Free:  ${(gpu.memory.free / 1e9).toFixed(2)} GB`);
      output.push('');
      output.push(`Utilization: ${gpu.utilization}%`);
      output.push(`Temperature: ${gpu.temperature}°C`);
      output.push(`Power: ${gpu.power?.toFixed(1)} W`);
      
      if (processes.length > 0) {
        output.push('');
        output.push(`GPU Processes (${processes.length}):`);
        for (const proc of processes) {
          const memGB = (proc.gpu_memory / 1e9).toFixed(2);
          output.push(`  PID ${proc.pid}: ${proc.name} - ${memGB} GB`);
        }
      } else {
        output.push('');
        output.push('No GPU processes running.');
      }
      
      return output.join('\n');
    }

    case 'start': {
      if (options.service) {
        const profile = SERVICE_PROFILES[options.service];
        if (!profile) {
          throw new Error(`Unknown service: ${options.service}`);
        }
        
        const status = await checkServiceStatus(options.service);
        if (status.running) {
          return `Service ${options.service} is already running (PID: ${status.pid})`;
        }
        
        const result = await startProcess({
          command: profile.command,
          cwd: profile.cwd || options.cwd,
          env: { ...profile.env, ...options.env },
          waitForPort: profile.port,
          timeout: options.timeout,
        });
        
        return `✅ Started ${options.service}\nPID: ${result.pid}\nPort: ${result.port || 'N/A'}\nStatus: ${result.status}`;
      }
      
      if (!options.command) {
        throw new Error('Command or service required');
      }
      
      const result = await startProcess({
        command: options.command,
        cwd: options.cwd,
        env: options.env,
        waitForPort: options.waitForPort,
        timeout: options.timeout,
      });
      
      return `✅ Started process\nPID: ${result.pid}\nStatus: ${result.status}`;
    }

    case 'kill': {
      const killed = await killProcess({
        pid: options.pid,
        name: options.filter?.name,
        port: options.filter?.port,
        force: options.force,
      });
      
      if (killed.length === 0) {
        return 'No processes killed.';
      }
      
      return `✅ Killed ${killed.length} process(es): ${killed.join(', ')}`;
    }

    case 'status': {
      if (!options.service) {
        throw new Error('Service name required');
      }
      
      const status = await checkServiceStatus(options.service);
      
      const output: string[] = [];
      output.push(`Service: ${status.service}`);
      output.push(`Running: ${status.running ? 'Yes ✅' : 'No ❌'}`);
      
      if (status.running) {
        output.push(`PID: ${status.pid}`);
        output.push(`Port: ${status.port}`);
        output.push(`Health: ${status.health || 'N/A'}`);
      }
      
      return output.join('\n');
    }

    case 'restart': {
      if (!options.service) {
        throw new Error('Service name required');
      }
      
      const profile = SERVICE_PROFILES[options.service];
      if (!profile) {
        throw new Error(`Unknown service: ${options.service}`);
      }
      
      // Kill existing
      const status = await checkServiceStatus(options.service);
      if (status.running && status.pid) {
        await killProcess({ pid: status.pid, force: !options.graceful });
        // Wait a moment
        await new Promise(r => setTimeout(r, 1000));
      }
      
      // Start new
      const result = await startProcess({
        command: profile.command,
        cwd: profile.cwd || options.cwd,
        env: { ...profile.env, ...options.env },
        waitForPort: profile.port,
        timeout: options.timeout || 30000,
      });
      
      return `✅ Restarted ${options.service}\nPID: ${result.pid}\nPort: ${result.port || 'N/A'}`;
    }

    case 'monitor': {
      if (!options.pid) {
        throw new Error('PID required for monitoring');
      }
      
      // Simple snapshot - full monitoring would need continuous sampling
      const processes = await listProcesses();
      const proc = processes.find(p => p.pid === options.pid);
      
      if (!proc) {
        return `Process ${options.pid} not found`;
      }
      
      return `Process ${options.pid}: ${proc.name}\nMemory: ${((proc.memory || 0) / 1024 / 1024).toFixed(1)} MB\nStatus: ${proc.status || 'running'}`;
    }

    case 'wait': {
      if (!options.pid) {
        throw new Error('PID required');
      }
      
      const timeout = options.timeout || 300000;
      const startTime = Date.now();
      
      while (Date.now() - startTime < timeout) {
        const processes = await listProcesses();
        const proc = processes.find(p => p.pid === options.pid);
        
        if (!proc) {
          return `Process ${options.pid} has exited.\nDuration: ${Date.now() - startTime}ms`;
        }
        
        await new Promise(r => setTimeout(r, 1000));
      }
      
      return `Timeout waiting for process ${options.pid}`;
    }

    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}
