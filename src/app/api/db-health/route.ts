import { NextResponse } from 'next/server';
import { queryOne, queryAll } from '@/lib/crm/database';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

export async function GET() {
  const started = Date.now();

  const env = {
    DB_HOST: process.env.DB_HOST ?? null,
    DB_PORT: process.env.DB_PORT ?? null,
    DB_USER: process.env.DB_USER ?? null,
    DB_NAME: process.env.DB_NAME ?? null,
    DB_PASSWORD_set: Boolean(process.env.DB_PASSWORD),
  };

  try {
    const ping = await queryOne('SELECT VERSION() AS version, NOW() AS now, DATABASE() AS db');
    const tables = await queryAll('SHOW TABLES');

    return NextResponse.json({
      ok: true,
      env,
      ping,
      tableCount: tables.length,
      elapsedMs: Date.now() - started,
    });
  } catch (err: unknown) {
    const e = err as { code?: string; errno?: number; message?: string; sqlState?: string };
    return NextResponse.json(
      {
        ok: false,
        env,
        error: {
          code: e.code ?? null,
          errno: e.errno ?? null,
          sqlState: e.sqlState ?? null,
          message: e.message ?? String(err),
        },
        elapsedMs: Date.now() - started,
      },
      { status: 500 },
    );
  }
}
