/**
 * Convertit le dump MySQL Paperasse en base SQLite locale.
 *
 * Usage: npx tsx scripts/import-sql-to-sqlite.ts
 */

import Database from 'better-sqlite3';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { resolve } from 'path';

const SQL_FILE = resolve(process.cwd(), '..', 'paperasse_2026-04-05 (1).sql');
const DB_FILE = resolve(process.cwd(), 'data', 'paperasse.db');

// Tables à importer
const TABLES_TO_IMPORT = new Set([
  'users',
  'orders',
  'clients',
  'people',
  'payments',
  'prestations',
  'prestations_families',
]);

// Créer le dossier data s'il n'existe pas
import { mkdirSync } from 'fs';
mkdirSync(resolve(process.cwd(), 'data'), { recursive: true });

// Supprimer la DB existante et en créer une nouvelle
import { existsSync, unlinkSync } from 'fs';
if (existsSync(DB_FILE)) unlinkSync(DB_FILE);

const db = new Database(DB_FILE);

// Optimisations SQLite pour import rapide
db.pragma('journal_mode = WAL');
db.pragma('synchronous = OFF');
db.pragma('foreign_keys = OFF');

// ─── Créer les tables SQLite ──────────────────────────────

db.exec(`
  CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    tel TEXT,
    emergency_tel TEXT,
    address TEXT,
    created_at TEXT,
    updated_at TEXT,
    deleted_at TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    hidden INTEGER NOT NULL DEFAULT 0,
    referral_link TEXT,
    job_title TEXT NOT NULL DEFAULT '',
    partner_id INTEGER
  );

  CREATE TABLE clients (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    created_at TEXT,
    updated_at TEXT,
    customer_type TEXT,
    customer_id INTEGER,
    receive_from TEXT,
    origin_of_provenance TEXT,
    created_by INTEGER,
    updated_by INTEGER,
    referral TEXT
  );

  CREATE TABLE people (
    id INTEGER PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone_number TEXT,
    address TEXT,
    city TEXT,
    zip_code TEXT,
    created_at TEXT,
    updated_at TEXT,
    phone2 TEXT,
    place_of_birth TEXT,
    date_of_birth TEXT,
    sex TEXT,
    country TEXT
  );

  CREATE TABLE orders (
    id INTEGER PRIMARY KEY,
    number TEXT,
    client_id INTEGER NOT NULL,
    prestation_id INTEGER NOT NULL,
    partenaire_id INTEGER,
    state INTEGER NOT NULL DEFAULT 1,
    discount TEXT,
    margin TEXT,
    reason TEXT,
    deadline TEXT,
    statuts TEXT NOT NULL DEFAULT 'Attente de prise en charge',
    created_at TEXT,
    updated_at TEXT,
    user_id INTEGER,
    deleted_at TEXT,
    created_by INTEGER,
    updated_by INTEGER,
    is_payed INTEGER NOT NULL DEFAULT 0,
    total_price TEXT,
    subtotal TEXT,
    tax_total TEXT,
    vat REAL NOT NULL DEFAULT 0,
    commission INTEGER NOT NULL DEFAULT 0,
    status_updated_at TEXT,
    status_updated_by INTEGER
  );

  CREATE TABLE payments (
    id INTEGER PRIMARY KEY,
    amount TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'cash',
    user_id INTEGER,
    order_id INTEGER,
    reason TEXT,
    created_at TEXT,
    updated_at TEXT
  );

  CREATE TABLE prestations (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    price TEXT,
    family_id INTEGER,
    tags TEXT,
    created_at TEXT,
    updated_at TEXT,
    deleted_at TEXT,
    presentation TEXT,
    conditions TEXT,
    required_documents TEXT,
    sales_arguments TEXT,
    commission INTEGER NOT NULL DEFAULT 0,
    commission_rate REAL NOT NULL DEFAULT 0,
    is_archived INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE prestations_families (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    name TEXT NOT NULL,
    parent_family_id INTEGER,
    created_at TEXT,
    updated_at TEXT,
    deleted_at TEXT,
    archived INTEGER NOT NULL DEFAULT 0
  );

  -- Index pour les requêtes fréquentes
  CREATE INDEX idx_orders_client_id ON orders(client_id);
  CREATE INDEX idx_orders_user_id ON orders(user_id);
  CREATE INDEX idx_orders_created_by ON orders(created_by);
  CREATE INDEX idx_orders_prestation_id ON orders(prestation_id);
  CREATE INDEX idx_orders_created_at ON orders(created_at);
  CREATE INDEX idx_orders_statuts ON orders(statuts);
  CREATE INDEX idx_orders_is_payed ON orders(is_payed);
  CREATE INDEX idx_orders_deleted_at ON orders(deleted_at);
  CREATE INDEX idx_clients_customer_id ON clients(customer_id);
  CREATE INDEX idx_clients_user_id ON clients(user_id);
  CREATE INDEX idx_payments_order_id ON payments(order_id);
  CREATE INDEX idx_payments_user_id ON payments(user_id);
  CREATE INDEX idx_prestations_family_id ON prestations(family_id);
  CREATE INDEX idx_people_last_name ON people(last_name);
  CREATE INDEX idx_people_email ON people(email);
  CREATE INDEX idx_users_is_active ON users(is_active);
`);

console.log('✅ Tables SQLite créées');

// ─── Colonnes par table (pour mapper les INSERT) ──────────

const TABLE_COLUMNS: Record<string, string[]> = {
  users: ['id', 'name', 'email', 'tel', 'emergency_tel', 'address', 'email_verified_at', 'password', 'remember_token', 'created_at', 'updated_at', 'deleted_at', 'is_active', 'two_factor_code', 'two_factor_expires_at', 'hidden', 'referral_link', 'referral_expiry_date', 'token', 'approved_at', 'approval_sent_at', 'job_title', 'partner_id', 'partnership_starts_at', 'partnership_ends_at'],
  orders: ['id', 'number', 'client_id', 'prestation_id', 'partenaire_id', 'state', 'uuid', 'client_uuid', 'user_permanent_uuid', 'discount', 'margin', 'reason', 'deadline', 'statuts', 'invoice_company_id', 'created_at', 'updated_at', 'declinaison_id', 'user_id', 'deleted_at', 'needs_docs', 'created_by', 'pieces', 'vat', 'total_price', 'subtotal', 'tax_total', 'updated_by', 'is_payed', 'status_updated_at', 'status_updated_by', 'last_viewed_at', 'last_viewed_by', 'reseller_notification_sent', 'commission', 'paypal_id', 'quote_sent_at', 'quote_accepted_at', 'voucher_id'],
  clients: ['id', 'user_id', 'created_at', 'updated_at', 'customer_type', 'customer_id', 'receive_from', 'origin_of_provenance', 'created_by', 'updated_by', 'applied_commission', 'referral', 'voucher_id', 'code', 'code_expires_at', 'code_validated_at', 'login_token', 'login_token_expires_at'],
  people: ['id', 'first_name', 'last_name', 'email', 'phone_number', 'address', 'city', 'zip_code', 'created_at', 'updated_at', 'phone2', 'place_of_birth', 'date_of_birth', 'common_or_married_name', 'country_of_birth', 'sex', 'photo', 'name_of_the_road', 'number_of_the_road', 'date_of_accommodation', 'country', 'domiciled', 'host_type', 'host_last_name', 'host_first_name', 'host_place_of_birth', 'host_date_of_birth', 'host_country_of_birth', 'host_structure_name'],
  payments: ['id', 'amount', 'type', 'user_id', 'order_id', 'reason', 'created_at', 'updated_at'],
  prestations: ['id', 'uuid', 'name', 'price', 'family_id', 'tags', 'partenaire_id', 'documents', 'external_devis', 'created_at', 'updated_at', 'deleted_at', 'is_translation', 'original_id', 'is_duplicate', 'presentation', 'conditions', 'required_documents', 'sales_arguments', 'useful_links', 'pieces', 'commission', 'commission_rate', 'is_imported', 'is_archived'],
  prestations_families: ['id', 'user_id', 'name', 'parent_family_id', 'created_at', 'updated_at', 'deleted_at', 'archived'],
};

// Colonnes qu'on garde dans SQLite (par index dans le INSERT source)
const SQLITE_COLUMNS: Record<string, string[]> = {
  users: ['id', 'name', 'email', 'tel', 'emergency_tel', 'address', 'created_at', 'updated_at', 'deleted_at', 'is_active', 'hidden', 'referral_link', 'job_title', 'partner_id'],
  orders: ['id', 'number', 'client_id', 'prestation_id', 'partenaire_id', 'state', 'discount', 'margin', 'reason', 'deadline', 'statuts', 'created_at', 'updated_at', 'user_id', 'deleted_at', 'created_by', 'updated_by', 'is_payed', 'total_price', 'subtotal', 'tax_total', 'vat', 'commission', 'status_updated_at', 'status_updated_by'],
  clients: ['id', 'user_id', 'created_at', 'updated_at', 'customer_type', 'customer_id', 'receive_from', 'origin_of_provenance', 'created_by', 'updated_by', 'referral'],
  people: ['id', 'first_name', 'last_name', 'email', 'phone_number', 'address', 'city', 'zip_code', 'created_at', 'updated_at', 'phone2', 'place_of_birth', 'date_of_birth', 'sex', 'country'],
  payments: ['id', 'amount', 'type', 'user_id', 'order_id', 'reason', 'created_at', 'updated_at'],
  prestations: ['id', 'name', 'price', 'family_id', 'tags', 'created_at', 'updated_at', 'deleted_at', 'presentation', 'conditions', 'required_documents', 'sales_arguments', 'commission', 'commission_rate', 'is_archived'],
  prestations_families: ['id', 'user_id', 'name', 'parent_family_id', 'created_at', 'updated_at', 'deleted_at', 'archived'],
};

// Index des colonnes source à garder pour chaque table
function getColumnIndexes(table: string): number[] {
  const srcCols = TABLE_COLUMNS[table];
  const dstCols = SQLITE_COLUMNS[table];
  return dstCols.map(col => srcCols.indexOf(col));
}

// ─── Parser les INSERT du dump MySQL ──────────────────────

function parseValues(valuesStr: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let val = '';
  let inString = false;
  let escaped = false;
  let depth = 0;

  for (let i = 0; i < valuesStr.length; i++) {
    const c = valuesStr[i];

    if (escaped) {
      val += c;
      escaped = false;
      continue;
    }

    if (c === '\\') {
      val += c;
      escaped = true;
      continue;
    }

    if (inString) {
      val += c;
      if (c === "'") inString = false;
      continue;
    }

    if (c === "'") {
      val += c;
      inString = true;
      continue;
    }

    if (c === '(') {
      depth++;
      if (depth === 1) {
        current = [];
        val = '';
        continue;
      }
    }

    if (c === ')') {
      depth--;
      if (depth === 0) {
        current.push(val.trim());
        rows.push(current);
        val = '';
        continue;
      }
    }

    if (c === ',' && depth === 1) {
      current.push(val.trim());
      val = '';
      continue;
    }

    if (depth >= 1) {
      val += c;
    }
  }

  return rows;
}

function cleanValue(v: string): unknown {
  if (v === 'NULL') return null;
  if (v.startsWith("'") && v.endsWith("'")) {
    // Unescape MySQL string
    return v.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, '\\').replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\0/g, '');
  }
  const num = Number(v);
  if (!isNaN(num) && v !== '') return num;
  return v;
}

// ─── Import principal ─────────────────────────────────────

async function importDump() {
  const startTime = Date.now();

  const rl = createInterface({
    input: createReadStream(SQL_FILE, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });

  let currentTable = '';
  let lineBuffer = '';
  let totalRows = 0;
  const tableCounts: Record<string, number> = {};

  // Préparer les statements
  const stmts: Record<string, ReturnType<typeof db.prepare>> = {};
  for (const table of TABLES_TO_IMPORT) {
    const cols = SQLITE_COLUMNS[table];
    const placeholders = cols.map(() => '?').join(',');
    stmts[table] = db.prepare(`INSERT OR IGNORE INTO ${table} (${cols.join(',')}) VALUES (${placeholders})`);
    tableCounts[table] = 0;
  }

  const insertBatch = db.transaction((table: string, rows: unknown[][]) => {
    const indexes = getColumnIndexes(table);
    for (const row of rows) {
      const values = indexes.map(idx => {
        if (idx === -1) return null;
        return cleanValue(row[idx] as string);
      });
      try {
        stmts[table].run(...values);
        tableCounts[table]++;
      } catch {
        // Skip invalid rows silently
      }
    }
  });

  let batch: unknown[][] = [];
  const BATCH_SIZE = 1000;

  for await (const line of rl) {
    // Détecter les INSERT INTO pour nos tables
    const insertMatch = line.match(/^INSERT INTO `(\w+)`/);
    if (insertMatch) {
      const table = insertMatch[1];
      if (TABLES_TO_IMPORT.has(table)) {
        currentTable = table;
        lineBuffer = line;

        // Si la ligne se termine par ;, traiter immédiatement
        if (lineBuffer.endsWith(';')) {
          const valStart = lineBuffer.indexOf('VALUES');
          if (valStart !== -1) {
            const valuesStr = lineBuffer.slice(valStart + 6, -1);
            const rows = parseValues(valuesStr);
            batch.push(...rows);
            if (batch.length >= BATCH_SIZE) {
              insertBatch(currentTable, batch);
              totalRows += batch.length;
              batch = [];
            }
          }
          // Flush remaining
          if (batch.length > 0) {
            insertBatch(currentTable, batch);
            totalRows += batch.length;
            batch = [];
          }
          currentTable = '';
          lineBuffer = '';
        }
        continue;
      } else {
        currentTable = '';
        continue;
      }
    }

    // Continuer à accumuler les lignes pour la table courante
    if (currentTable && lineBuffer) {
      lineBuffer += line;

      if (line.endsWith(';')) {
        const valStart = lineBuffer.indexOf('VALUES');
        if (valStart !== -1) {
          const valuesStr = lineBuffer.slice(valStart + 6, -1);
          const rows = parseValues(valuesStr);
          batch.push(...rows);
        }
        // Flush
        if (batch.length > 0) {
          insertBatch(currentTable, batch);
          totalRows += batch.length;
          batch = [];
        }
        currentTable = '';
        lineBuffer = '';
      }
    }

    // Progress
    if (totalRows > 0 && totalRows % 5000 === 0) {
      process.stdout.write(`\r⏳ ${totalRows} lignes importées...`);
    }
  }

  // Flush final
  if (batch.length > 0 && currentTable) {
    insertBatch(currentTable, batch);
    totalRows += batch.length;
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n\n✅ Import terminé en ${duration}s — ${totalRows} lignes au total\n`);
  console.log('📊 Détail par table:');
  for (const [table, count] of Object.entries(tableCounts)) {
    console.log(`   ${table.padEnd(25)} ${count} lignes`);
  }

  // Vérification rapide
  console.log('\n🔍 Vérification:');
  for (const table of TABLES_TO_IMPORT) {
    const row = db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get() as { c: number };
    console.log(`   ${table.padEnd(25)} ${row.c} enregistrements`);
  }

  db.close();
}

importDump().catch(err => {
  console.error('❌ Erreur:', err);
  process.exit(1);
});
