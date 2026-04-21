import { queryAll } from './database';

const MAX_ROWS = 500;
const QUERY_TIMEOUT_MS = 10_000;

// Mots-clés interdits (toute requête d'écriture ou exfiltration fichier)
const FORBIDDEN_KEYWORDS =
  /\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|GRANT|REVOKE|CALL|EXECUTE|RENAME|HANDLER|LOCK|UNLOCK)\b|\bREPLACE\s+INTO\b|\bLOAD\s+DATA\b|\bINTO\s+(OUTFILE|DUMPFILE)\b/i;

// Tables sensibles (auth, files internes, télémétrie)
const FORBIDDEN_TABLES = [
  'password_resets',
  'credantials',
  'sessions',
  'api_keys',
  'telescope_entries',
  'telescope_entries_tags',
  'telescope_monitoring',
  'jobs',
  'failed_jobs',
  'webhook_calls',
  'pulse_aggregates',
  'pulse_entries',
  'pulse_values',
];

export interface SafeSqlSuccess {
  rows: Record<string, unknown>[];
  row_count: number;
  truncated: boolean;
  executed_sql: string;
  warning?: string;
}

export interface SafeSqlError {
  error: string;
}

export type SafeSqlResult = SafeSqlSuccess | SafeSqlError;

export async function safeSelect(sql: string): Promise<SafeSqlResult> {
  const trimmed = sql.trim().replace(/;+\s*$/, '');

  if (!trimmed) return { error: 'Requête vide.' };

  if (trimmed.includes(';')) {
    return { error: 'Une seule requête par appel — pas de point-virgule intermédiaire.' };
  }

  if (!/^(SELECT|WITH)\b/i.test(trimmed)) {
    return { error: 'Seules les requêtes SELECT ou WITH (CTE) sont autorisées.' };
  }

  const dangerous = trimmed.match(FORBIDDEN_KEYWORDS);
  if (dangerous) {
    return { error: `Mot-clé interdit : ${dangerous[0]}.` };
  }

  const lower = trimmed.toLowerCase();
  const forbidden = FORBIDDEN_TABLES.find((t) => new RegExp(`\\b${t}\\b`).test(lower));
  if (forbidden) {
    return { error: `Accès à la table '${forbidden}' interdit.` };
  }

  // LIMIT forcé si absent (regex approximative — on ne parse pas le SQL)
  const hasLimit = /\blimit\b\s+\d+/i.test(trimmed);
  const limited = hasLimit ? trimmed : `${trimmed} LIMIT ${MAX_ROWS}`;

  // Hint MySQL : kill côté serveur après timeout
  const withHint = limited.replace(/^SELECT\b/i, `SELECT /*+ MAX_EXECUTION_TIME(${QUERY_TIMEOUT_MS}) */`);

  try {
    const rows = await queryAll(withHint);
    return {
      rows: rows.slice(0, MAX_ROWS),
      row_count: rows.length,
      truncated: rows.length >= MAX_ROWS,
      executed_sql: withHint,
      warning: hasLimit ? undefined : `LIMIT ${MAX_ROWS} ajouté automatiquement.`,
    };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function listTables(): Promise<{ name: string; est_rows: number }[]> {
  const rows = await queryAll(
    `SELECT table_name AS name, IFNULL(table_rows, 0) AS est_rows
     FROM information_schema.tables
     WHERE table_schema = DATABASE()
     ORDER BY table_name`
  );
  return rows
    .filter((r) => !FORBIDDEN_TABLES.includes(String(r.name).toLowerCase()))
    .map((r) => ({ name: String(r.name), est_rows: Number(r.est_rows ?? 0) }));
}

export async function describeTables(
  tables: string[]
): Promise<Record<string, { columns: { name: string; type: string; nullable: boolean; key: string }[] }>> {
  const cleaned = tables
    .map((t) => t.trim())
    .filter((t) => /^[a-z_][a-z0-9_]*$/i.test(t))
    .filter((t) => !FORBIDDEN_TABLES.includes(t.toLowerCase()));

  if (cleaned.length === 0) return {};

  const placeholders = cleaned.map(() => '?').join(',');
  const rows = await queryAll(
    `SELECT table_name, column_name, data_type, is_nullable, column_key
     FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name IN (${placeholders})
     ORDER BY table_name, ordinal_position`,
    cleaned
  );

  const out: Record<string, { columns: { name: string; type: string; nullable: boolean; key: string }[] }> = {};
  for (const r of rows) {
    const t = String(r.TABLE_NAME ?? r.table_name);
    if (!out[t]) out[t] = { columns: [] };
    out[t].columns.push({
      name: String(r.COLUMN_NAME ?? r.column_name),
      type: String(r.DATA_TYPE ?? r.data_type),
      nullable: (r.IS_NULLABLE ?? r.is_nullable) === 'YES',
      key: String(r.COLUMN_KEY ?? r.column_key ?? ''),
    });
  }
  return out;
}
