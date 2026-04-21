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

const [rows] = await conn.query(
  `SELECT id, name, email, is_active, job_title, created_at FROM users
   WHERE email LIKE ? OR name LIKE ? OR name LIKE ?`,
  ['%gnonlonfoun%', '%Aurèle%', '%Aurele%']
);
console.log(`--- ${rows.length} résultat(s) ---`);
console.log(JSON.stringify(rows, null, 2));

await conn.end();
