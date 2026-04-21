import mysql from 'mysql2/promise';
import fs from 'node:fs';
import path from 'node:path';

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// 1. Chercher la structure de la table users
const [cols] = await conn.query("SHOW COLUMNS FROM users");
console.log('--- Colonnes de users ---');
console.log(cols.map(c => c.Field).join(', '));

// 2. Chercher Khelfi Yannis dans users
const [users] = await conn.query(
  `SELECT * FROM users WHERE name LIKE ? OR name LIKE ? OR email LIKE ?`,
  ['%Khelfi%', '%Yannis%', '%khelfi%']
);
console.log(`\n--- Résultats users (${users.length}) ---`);
console.log(JSON.stringify(users, null, 2));

await conn.end();
