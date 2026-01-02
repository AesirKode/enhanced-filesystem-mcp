
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { sqliteManager } from '../core/sqlite.js';

export const sqliteTool: Tool = {
  name: 'sqlite_tool',
  description: `SQLite database operations.

Operations:
- 'query': Execute SQL query (SELECT, INSERT, UPDATE, DELETE)
- 'schema': Get database schema (tables, views)
- 'inspect': Get table details (columns, types)
- 'close': Close database connection

Examples:

1. Select data:
{ operation: 'query', path: 'data.db', query: 'SELECT * FROM users LIMIT 5' }

2. Insert data:
{ operation: 'query', path: 'data.db', query: 'INSERT INTO users (name) VALUES (?)', params: ['Alice'] }

3. Get schema:
{ operation: 'schema', path: 'data.db' }

4. Inspect table:
{ operation: 'inspect', path: 'data.db', table: 'users' }`,

  inputSchema: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['query', 'schema', 'inspect', 'close'],
        description: 'SQLite operation'
      },
      path: {
        type: 'string',
        description: 'Path to SQLite database file'
      },
      query: {
        type: 'string',
        description: 'SQL query to execute'
      },
      params: {
        type: 'array',
        items: { type: 'string' }, // Simplified to strings/numbers/null in practice
        description: 'Query parameters'
      },
      table: {
        type: 'string',
        description: 'Table name (for inspect)'
      }
    },
    required: ['operation', 'path']
  }
};

export async function executeSqliteOperation(args: {
  operation: string;
  path: string;
  query?: string;
  params?: any[];
  table?: string;
}): Promise<string> {
  switch (args.operation) {
    case 'query':
      if (!args.query) throw new Error('query is required');
      const result = sqliteManager.query(args.path, args.query, args.params || []);
      if (result.error) throw new Error(result.error);

      if (result.rows) {
        return JSON.stringify(result.rows, null, 2);
      } else {
        return `Changes: ${result.changes}, Last ID: ${result.lastInsertRowid}`;
      }

    case 'schema':
      const schema = sqliteManager.getSchema(args.path);
      if (schema.error) throw new Error(schema.error);
      return JSON.stringify(schema.rows, null, 2);

    case 'inspect':
      if (!args.table) throw new Error('table is required');
      const info = sqliteManager.getTableInfo(args.path, args.table);
      if (info.error) throw new Error(info.error);
      return JSON.stringify(info.rows, null, 2);

    case 'close':
      sqliteManager.close(args.path);
      return 'Database connection closed';

    default:
      throw new Error(`Unknown operation: ${args.operation}`);
  }
}
