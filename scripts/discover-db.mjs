import mysql from 'mysql2/promise';

const conn = await mysql.createConnection({
  host: '157.90.239.125',
  user: 'ai_user',
  password: process.env.DB_PASSWORD,
  multipleStatements: false,
});

const [dbs] = await conn.query('SHOW DATABASES');
console.log('Databases visible to ai_user:');
for (const row of dbs) {
  console.log('  -', row.Database);
}

const expected = ['clients', 'orders', 'people', 'prestations', 'users', 'payments', 'prestations_families'];
for (const row of dbs) {
  const db = row.Database;
  if (['information_schema', 'mysql', 'performance_schema', 'sys'].includes(db)) continue;
  try {
    const [tables] = await conn.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = ?`,
      [db]
    );
    const names = tables.map(t => t.table_name || t.TABLE_NAME);
    const hits = expected.filter(e => names.includes(e));
    console.log(`\nDB "${db}" — ${names.length} tables, ${hits.length}/${expected.length} expected tables present`);
    if (hits.length >= 5) {
      console.log('  -> Likely match. Tables:', names.sort().join(', '));
    }
  } catch (e) {
    console.log(`\nDB "${db}" — cannot inspect:`, e.message);
  }
}

await conn.end();
