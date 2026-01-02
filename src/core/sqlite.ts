
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export interface SqliteResult {
  columns?: string[];
  rows?: any[];
  changes?: number;
  lastInsertRowid?: number | bigint;
  error?: string;
}

export class SqliteManager {
  private dbs: Map<string, Database.Database> = new Map();

  constructor() {}

  private getDb(filePath: string): Database.Database {
    const fullPath = path.resolve(filePath);

    if (!this.dbs.has(fullPath)) {
      // Ensure directory exists
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const db = new Database(fullPath);
      this.dbs.set(fullPath, db);
    }

    return this.dbs.get(fullPath)!;
  }

  public close(filePath: string) {
    const fullPath = path.resolve(filePath);
    const db = this.dbs.get(fullPath);
    if (db) {
      db.close();
      this.dbs.delete(fullPath);
    }
  }

  public closeAll() {
    for (const db of this.dbs.values()) {
      db.close();
    }
    this.dbs.clear();
  }

  public query(filePath: string, sql: string, params: any[] = []): SqliteResult {
    try {
      const db = this.getDb(filePath);
      const stmt = db.prepare(sql);

      if (stmt.reader) {
        const rows = stmt.all(...params);
        const columns = rows.length > 0 ? Object.keys(rows[0] as object) : [];
        return { columns, rows };
      } else {
        const info = stmt.run(...params);
        return {
          changes: info.changes,
          lastInsertRowid: info.lastInsertRowid
        };
      }
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }

  public getSchema(filePath: string): SqliteResult {
    const sql = `
      SELECT name, type, sql
      FROM sqlite_master
      WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `;
    return this.query(filePath, sql);
  }

  public getTableInfo(filePath: string, tableName: string): SqliteResult {
    const sql = `PRAGMA table_info('${tableName}')`;
    return this.query(filePath, sql);
  }
}

export const sqliteManager = new SqliteManager();
