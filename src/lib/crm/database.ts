import initSqlJs, { Database } from 'sql.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const DB_PATH = resolve(process.cwd(), 'data', 'paperasse.db');

let _db: Database | null = null;
let _initPromise: Promise<Database> | null = null;

async function initDb(): Promise<Database> {
  const SQL = await initSqlJs();
  const buffer = readFileSync(DB_PATH);
  return new SQL.Database(buffer);
}

export async function getDb(): Promise<Database> {
  if (_db) return _db;
  if (!_initPromise) {
    _initPromise = initDb().then(db => {
      _db = db;
      return db;
    });
  }
  return _initPromise;
}

// Helper: exécute une requête et retourne un tableau d'objets
export async function queryAll(sql: string, params: unknown[] = []): Promise<Record<string, unknown>[]> {
  const db = await getDb();
  const stmt = db.prepare(sql);
  stmt.bind(params as initSqlJs.BindParams);

  const results: Record<string, unknown>[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push(row as Record<string, unknown>);
  }
  stmt.free();
  return results;
}

// Helper: exécute une requête et retourne le premier résultat
export async function queryOne(sql: string, params: unknown[] = []): Promise<Record<string, unknown> | null> {
  const rows = await queryAll(sql, params);
  return rows[0] || null;
}
