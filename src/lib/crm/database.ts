import mysql, { Pool } from 'mysql2/promise';

let _pool: Pool | null = null;

function getPool(): Pool {
  if (_pool) return _pool;

  const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT } = process.env;
  if (!DB_HOST || !DB_USER || !DB_PASSWORD || !DB_NAME) {
    throw new Error('Variables DB_HOST/DB_USER/DB_PASSWORD/DB_NAME manquantes dans .env.local');
  }

  _pool = mysql.createPool({
    host: DB_HOST,
    port: DB_PORT ? Number(DB_PORT) : 3306,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    // La DB CRM applique max_user_connections=5 sur ai_user.
    // On reste sous la limite pour laisser de la place aux autres clients
    // (dev server + scripts ad-hoc) sans déclencher ER_USER_LIMIT_REACHED.
    connectionLimit: 3,
    queueLimit: 0,
    dateStrings: true,
    decimalNumbers: true,
  });

  return _pool;
}

export async function queryAll(sql: string, params: unknown[] = []): Promise<Record<string, unknown>[]> {
  const [rows] = await getPool().query(sql, params);
  return rows as Record<string, unknown>[];
}

export async function queryOne(sql: string, params: unknown[] = []): Promise<Record<string, unknown> | null> {
  const rows = await queryAll(sql, params);
  return rows[0] || null;
}
