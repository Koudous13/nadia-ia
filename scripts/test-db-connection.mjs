import mysql from 'mysql2/promise';
import fs from 'node:fs';
import path from 'node:path';

// Charger .env.local manuellement
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

console.log('--- Test de connexion MySQL ---');
console.log(`Host     : ${DB_HOST}:${DB_PORT || 3306}`);
console.log(`User     : ${DB_USER}`);
console.log(`Database : ${DB_NAME}`);
console.log('');

try {
  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT ? Number(DB_PORT) : 3306,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    connectTimeout: 10000,
  });

  console.log('[OK] Connexion établie');

  const [ver] = await conn.query('SELECT VERSION() AS version, NOW() AS now, DATABASE() AS db');
  console.log('[OK] Ping :', ver[0]);

  const [tables] = await conn.query('SHOW TABLES');
  console.log(`[OK] ${tables.length} tables trouvées dans "${DB_NAME}"`);

  await conn.end();
  process.exit(0);
} catch (err) {
  console.error('[ERREUR] Échec de la connexion :');
  console.error(`  code    : ${err.code}`);
  console.error(`  errno   : ${err.errno}`);
  console.error(`  message : ${err.message}`);
  process.exit(1);
}
