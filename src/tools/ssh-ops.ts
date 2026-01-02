
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { sshManager, SshConfig } from '../core/ssh.js';

export const sshTool: Tool = {
  name: 'ssh_tool',
  description: `SSH client for remote server management.

Operations:
- 'connect': Establish a persistent connection
- 'exec': Execute a command on remote server
- 'upload': Upload file via SFTP
- 'download': Download file via SFTP
- 'list': List remote directory contents
- 'disconnect': Close connection

Parameters:
- operation: Operation to perform
- sessionId: Unique ID for the session (required for all operations)
- host, port, username, password, privateKeyPath: Connection details (for 'connect')
- command: Command to run (for 'exec')
- localPath, remotePath: File paths (for 'upload', 'download', 'list')

Examples:

1. Connect:
{
  operation: 'connect',
  sessionId: 'prod-server',
  host: '192.168.1.10',
  username: 'admin',
  privateKeyPath: 'C:/Users/me/.ssh/id_rsa'
}

2. Execute command:
{
  operation: 'exec',
  sessionId: 'prod-server',
  command: 'ls -la /var/www'
}

3. Upload file:
{
  operation: 'upload',
  sessionId: 'prod-server',
  localPath: 'D:/build/app.zip',
  remotePath: '/tmp/app.zip'
}

4. Disconnect:
{ operation: 'disconnect', sessionId: 'prod-server' }`,

  inputSchema: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['connect', 'exec', 'upload', 'download', 'list', 'disconnect'],
        description: 'SSH operation'
      },
      sessionId: {
        type: 'string',
        description: 'Session identifier'
      },
      host: { type: 'string' },
      port: { type: 'number', default: 22 },
      username: { type: 'string' },
      password: { type: 'string' },
      privateKeyPath: { type: 'string' },
      passphrase: { type: 'string' },
      command: { type: 'string' },
      localPath: { type: 'string' },
      remotePath: { type: 'string' }
    },
    required: ['operation', 'sessionId']
  }
};

export async function executeSshOperation(args: any): Promise<string> {
  const { operation, sessionId } = args;

  if (!sessionId) throw new Error('sessionId is required');

  switch (operation) {
    case 'connect':
      if (!args.host || !args.username) {
        throw new Error('host and username are required for connect');
      }
      const config: SshConfig = {
        host: args.host,
        port: args.port,
        username: args.username,
        password: args.password,
        privateKeyPath: args.privateKeyPath,
        passphrase: args.passphrase
      };
      await sshManager.connect(sessionId, config);
      return `Connected to ${args.host} as ${args.username} (Session: ${sessionId})`;

    case 'exec':
      if (!args.command) throw new Error('command is required');
      const result = await sshManager.exec(sessionId, args.command);
      let output = '';
      if (result.stdout) output += result.stdout;
      if (result.stderr) output += `\nSTDERR:\n${result.stderr}`;
      return output || '(No output)';

    case 'upload':
      if (!args.localPath || !args.remotePath) throw new Error('localPath and remotePath required');
      await sshManager.upload(sessionId, args.localPath, args.remotePath);
      return `Uploaded ${args.localPath} to ${args.remotePath}`;

    case 'download':
      if (!args.localPath || !args.remotePath) throw new Error('localPath and remotePath required');
      await sshManager.download(sessionId, args.remotePath, args.localPath);
      return `Downloaded ${args.remotePath} to ${args.localPath}`;

    case 'list':
      if (!args.remotePath) throw new Error('remotePath required');
      const list = await sshManager.list(sessionId, args.remotePath);
      return list.map((item: any) => {
        const type = item.attrs.isDirectory() ? 'd' : '-';
        return `${type} ${item.filename} \t${item.attrs.size}`;
      }).join('\n');

    case 'disconnect':
      const disconnected = sshManager.disconnect(sessionId);
      return disconnected ? `Session ${sessionId} disconnected` : `Session ${sessionId} not found`;

    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}
