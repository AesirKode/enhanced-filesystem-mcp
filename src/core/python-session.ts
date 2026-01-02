
import { spawn, ChildProcess } from 'child_process';
import path from 'path';

interface Session {
  id: string;
  process: ChildProcess;
  buffer: string;
  resolve?: (value: any) => void;
  reject?: (reason: any) => void;
  timer?: NodeJS.Timeout;
  lastUsed: number;
}

export class PythonSessionManager {
  private sessions: Map<string, Session> = new Map();
  private readonly SESSION_TIMEOUT = 1000 * 60 * 60; // 1 hour

  constructor() {
    // Periodic cleanup every 10 minutes
    setInterval(() => this.cleanup(), 1000 * 60 * 10);
  }

  private cleanup() {
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      if (now - session.lastUsed > this.SESSION_TIMEOUT) {
        console.log(`Cleaning up idle Python session: ${id}`);
        this.killSession(id);
      }
    }
  }

  public createSession(id: string, cwd?: string): void {
    if (this.sessions.has(id)) {
      throw new Error(`Session ${id} already exists`);
    }

    // We use a simple wrapper to handle JSON I/O for reliability
    const wrapperScript = `
import sys
import code
import json
import io
from contextlib import redirect_stdout, redirect_stderr

interpreter = code.InteractiveInterpreter()

while True:
    try:
        line = sys.stdin.readline()
        if not line: break
        request = json.loads(line)
        source = request.get('code', '')

        stdout = io.StringIO()
        stderr = io.StringIO()

        with redirect_stdout(stdout), redirect_stderr(stderr):
            try:
                # Compile and run to handle statements and expressions
                try:
                    # Try eval first (for expressions)
                    code_obj = compile(source, '<stdin>', 'eval')
                    result = eval(code_obj, interpreter.locals)
                    if result is not None:
                        print(repr(result))
                except SyntaxError:
                    # Fallback to exec (for statements)
                    exec(source, interpreter.locals)
            except Exception:
                interpreter.showtraceback()

        response = {
            'stdout': stdout.getvalue(),
            'stderr': stderr.getvalue()
        }
        print(json.dumps(response))
        sys.stdout.flush()
    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.stdout.flush()
`;

    const proc = spawn('python', ['-c', wrapperScript], {
      cwd: cwd || process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const session: Session = {
      id,
      process: proc,
      buffer: '',
      lastUsed: Date.now()
    };

    proc.stdout?.on('data', (data) => {
      if (!session.resolve) return;

      const chunk = data.toString();
      session.buffer += chunk;

      // Try to parse JSON
      try {
        // Check if we have a complete JSON object (simple heuristic: ends with newline)
        if (session.buffer.trim().endsWith('}')) {
            const response = JSON.parse(session.buffer);
            session.buffer = '';
            if (session.timer) clearTimeout(session.timer);
            session.resolve!(response);
            session.resolve = undefined;
            session.reject = undefined;
        }
      } catch (e) {
        // Incomplete JSON, wait for more data
      }
    });

    proc.stderr?.on('data', (data) => {
      // Wrapper redirects stderr to JSON, so this is real process error
      console.error(`[Python Session ${id} Error]: ${data}`);
    });

    proc.on('exit', () => {
      this.sessions.delete(id);
      if (session.reject) {
        session.reject(new Error('Process exited unexpectedly'));
      }
    });

    this.sessions.set(id, session);
  }

  public async execute(id: string, code: string, timeout = 30000): Promise<{ stdout: string; stderr: string }> {
    let session = this.sessions.get(id);

    if (!session) {
      // Auto-create session if not exists
      this.createSession(id);
      session = this.sessions.get(id)!;
    }

    session.lastUsed = Date.now();

    if (session.resolve) {
      throw new Error('Session is busy');
    }

    return new Promise((resolve, reject) => {
      session!.resolve = resolve;
      session!.reject = reject;
      session!.buffer = '';

      const request = JSON.stringify({ code }) + '\n';
      session!.process.stdin?.write(request);

      session!.timer = setTimeout(() => {
        session!.resolve = undefined;
        session!.reject = undefined;
        reject(new Error(`Execution timeout after ${timeout}ms`));
        // We might want to kill/restart session here
      }, timeout);
    });
  }

  public killSession(id: string) {
    const session = this.sessions.get(id);
    if (session) {
      session.process.kill();
      this.sessions.delete(id);
    }
  }

  public listSessions(): string[] {
    return Array.from(this.sessions.keys());
  }
}

export const pythonSessionManager = new PythonSessionManager();
