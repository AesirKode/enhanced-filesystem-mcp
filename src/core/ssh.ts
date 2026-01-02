
import { Client, ConnectConfig, SFTPWrapper } from 'ssh2';
import fs from 'fs';
import path from 'path';

export interface SshConfig {
  host: string;
  port?: number;
  username: string;
  password?: string;
  privateKeyPath?: string;
  passphrase?: string;
}

interface SshSession {
  id: string;
  client: Client;
  config: SshConfig;
  lastUsed: number;
  sftp?: SFTPWrapper;
}

export class SshManager {
  private sessions: Map<string, SshSession> = new Map();
  private readonly SESSION_TIMEOUT = 1000 * 60 * 30; // 30 minutes

  constructor() {
    // Periodic cleanup
    setInterval(() => this.cleanup(), 1000 * 60 * 5);
  }

  private cleanup() {
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      if (now - session.lastUsed > this.SESSION_TIMEOUT) {
        this.disconnect(id);
      }
    }
  }

  public async connect(id: string, config: SshConfig): Promise<void> {
    if (this.sessions.has(id)) {
      // If config is different, disconnect and reconnect?
      // For now, assume if ID exists, we use it, or user must disconnect first.
      return;
    }

    return new Promise((resolve, reject) => {
      const client = new Client();

      const connectConfig: ConnectConfig = {
        host: config.host,
        port: config.port || 22,
        username: config.username,
      };

      if (config.privateKeyPath) {
        try {
          connectConfig.privateKey = fs.readFileSync(config.privateKeyPath);
          if (config.passphrase) connectConfig.passphrase = config.passphrase;
        } catch (err) {
          reject(new Error(`Failed to read private key: ${err}`));
          return;
        }
      } else if (config.password) {
        connectConfig.password = config.password;
      }

      client.on('ready', () => {
        this.sessions.set(id, {
          id,
          client,
          config,
          lastUsed: Date.now()
        });
        resolve();
      });

      client.on('error', (err) => {
        reject(err);
      });

      client.on('end', () => {
        this.sessions.delete(id);
      });

      try {
        client.connect(connectConfig);
      } catch (err) {
        reject(err);
      }
    });
  }

  public disconnect(id: string): boolean {
    const session = this.sessions.get(id);
    if (session) {
      session.client.end();
      this.sessions.delete(id);
      return true;
    }
    return false;
  }

  private getSession(id: string): SshSession {
    const session = this.sessions.get(id);
    if (!session) {
      throw new Error(`SSH session '${id}' not found. Please connect first.`);
    }
    session.lastUsed = Date.now();
    return session;
  }

  public async exec(id: string, command: string): Promise<{ stdout: string; stderr: string; code: number }> {
    const session = this.getSession(id);

    return new Promise((resolve, reject) => {
      session.client.exec(command, (err, stream) => {
        if (err) return reject(err);

        let stdout = '';
        let stderr = '';

        stream.on('close', (code: number, signal: any) => {
          resolve({ stdout, stderr, code });
        }).on('data', (data: Buffer) => {
          stdout += data.toString();
        }).stderr.on('data', (data: Buffer) => {
          stderr += data.toString();
        });
      });
    });
  }

  private async getSftp(session: SshSession): Promise<SFTPWrapper> {
    if (session.sftp) return session.sftp;

    return new Promise((resolve, reject) => {
      session.client.sftp((err, sftp) => {
        if (err) return reject(err);
        session.sftp = sftp;
        resolve(sftp);
      });
    });
  }

  public async upload(id: string, localPath: string, remotePath: string): Promise<void> {
    const session = this.getSession(id);
    const sftp = await this.getSftp(session);

    return new Promise((resolve, reject) => {
      sftp.fastPut(localPath, remotePath, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  public async download(id: string, remotePath: string, localPath: string): Promise<void> {
    const session = this.getSession(id);
    const sftp = await this.getSftp(session);

    return new Promise((resolve, reject) => {
      sftp.fastGet(remotePath, localPath, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  public async list(id: string, remotePath: string): Promise<any[]> {
    const session = this.getSession(id);
    const sftp = await this.getSftp(session);

    return new Promise((resolve, reject) => {
      sftp.readdir(remotePath, (err, list) => {
        if (err) reject(err);
        else resolve(list);
      });
    });
  }
}

export const sshManager = new SshManager();
