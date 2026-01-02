import { spawn } from 'child_process';

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  duration: number;
}

export async function executeCommand(
  command: string,
  options: {
    cwd?: string;
    timeout?: number;
    shell?: boolean;
  } = {}
): Promise<ExecResult> {
  const startTime = Date.now();
  const timeout = options.timeout || 30000;
  const shell = options.shell !== undefined ? options.shell : true;

  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';

    const proc = spawn(command, {
      cwd: options.cwd,
      shell,
      env: process.env,
    });

    proc.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    proc.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on('close', (exitCode: number | null) => {
      clearTimeout(timer);
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode,
        duration: Date.now() - startTime,
      });
    });

    proc.on('error', (error: Error) => {
      clearTimeout(timer);
      reject(error);
    });

    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error(`Command timeout after ${timeout}ms`));
    }, timeout);
  });
}

export async function executePython(
  code: string,
  options: {
    cwd?: string;
    timeout?: number;
  } = {}
): Promise<ExecResult> {
  const startTime = Date.now();
  const timeout = options.timeout || 30000;

  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';

    const proc = spawn('python', ['-c', code], {
      cwd: options.cwd,
      env: process.env,
    });

    proc.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    proc.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on('close', (exitCode: number | null) => {
      clearTimeout(timer);
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode,
        duration: Date.now() - startTime,
      });
    });

    proc.on('error', (error: Error) => {
      clearTimeout(timer);
      reject(error);
    });

    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error(`Python execution timeout after ${timeout}ms`));
    }, timeout);
  });
}
