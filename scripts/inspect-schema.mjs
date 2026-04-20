import mysql from 'mysql2/promise';

const conn = await mysql.createConnection({
  host: '157.90.239.125',
  user: 'ai_user',
  password: process.env.DB_PASSWORD,
  database: 'paperasse',
});

const tables = ['orders', 'payments', 'prestations', 'clients', 'people', 'users', 'prestations_families'];
for (const t of tables) {
  const [cols] = await conn.query(
    `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema='paperasse' AND table_name=? ORDER BY ordinal_position`,
    [t]
  );
  console.log(`\n=== ${t} ===`);
  for (const c of cols) console.log(`  ${c.COLUMN_NAME || c.column_name} (${c.DATA_TYPE || c.data_type})`);
}

console.log('\n=== sample payment.amount ===');
const [rows] = await conn.query(`SELECT id, amount FROM payments LIMIT 3`);
for (const r of rows) console.log(`  id=${r.id} amount=${JSON.stringify(r.amount)}`);

console.log('\n=== sample prestation.price ===');
const [p] = await conn.query(`SELECT id, name, price FROM prestations LIMIT 3`);
for (const r of p) console.log(`  id=${r.id} name=${r.name} price=${JSON.stringify(r.price)}`);

await conn.end();
