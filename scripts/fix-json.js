const Database = require('better-sqlite3');
const db = new Database('./data/paperasse.db');

// Diagnostiquer le format
const row = db.prepare('SELECT amount FROM payments LIMIT 1').get();
const raw = row.amount;
console.log('Raw:', JSON.stringify(raw));

// Le problème: les backslashes MySQL sont dans la string
// On doit remplacer \" par " pour avoir du JSON valide
const cleaned = raw.replace(/\\"/g, '"');
console.log('Cleaned:', cleaned);
try {
  console.log('Parsed:', JSON.parse(cleaned));
} catch(e) {
  console.log('Parse fail:', e.message);
}

// Appliquer le fix sur toute la table
console.log('\nNettoyage en cours...');

const all = db.prepare('SELECT id, amount FROM payments').all();
const update = db.prepare('UPDATE payments SET amount = ? WHERE id = ?');

const fixAll = db.transaction(() => {
  let fixed = 0;
  for (const row of all) {
    const clean = row.amount.replace(/\\"/g, '"');
    if (clean !== row.amount) {
      update.run(clean, row.id);
      fixed++;
    }
  }
  return fixed;
});

const fixed = fixAll();
console.log('Fixed:', fixed, 'rows');

// Aussi nettoyer les JSON dans orders (total_price, subtotal, tax_total, discount, margin)
for (const col of ['total_price', 'subtotal', 'tax_total', 'discount', 'margin']) {
  const rows = db.prepare(`SELECT id, ${col} FROM orders WHERE ${col} IS NOT NULL`).all();
  const upd = db.prepare(`UPDATE orders SET ${col} = ? WHERE id = ?`);
  const fixCol = db.transaction(() => {
    let n = 0;
    for (const r of rows) {
      const v = r[col];
      if (typeof v === 'string' && v.includes('\\"')) {
        upd.run(v.replace(/\\"/g, '"'), r.id);
        n++;
      }
    }
    return n;
  });
  const count = fixCol();
  if (count > 0) console.log(`Fixed orders.${col}:`, count, 'rows');
}

// Aussi nettoyer prestations.price
const presRows = db.prepare('SELECT id, price FROM prestations WHERE price IS NOT NULL').all();
const presUpd = db.prepare('UPDATE prestations SET price = ? WHERE id = ?');
const fixPres = db.transaction(() => {
  let n = 0;
  for (const r of presRows) {
    if (typeof r.price === 'string' && r.price.includes('\\"')) {
      presUpd.run(r.price.replace(/\\"/g, '"'), r.id);
      n++;
    }
  }
  return n;
});
const presFix = fixPres();
if (presFix > 0) console.log('Fixed prestations.price:', presFix, 'rows');

// Vérification
console.log('\n=== Vérification ===');
const sample = db.prepare('SELECT id, amount FROM payments LIMIT 3').all();
for (const s of sample) {
  console.log(s.id, JSON.parse(s.amount));
}

console.log('\n=== CA PAR VENDEUR (top 10) ===');
const ca = db.prepare(`
  SELECT u.name as vendeur, COUNT(DISTINCT o.id) as nb_commandes,
         ROUND(SUM(CAST(json_extract(pay.amount, '$.amount') AS REAL)) / 100.0, 2) as ca_encaisse
  FROM payments pay
  JOIN orders o ON pay.order_id = o.id
  JOIN users u ON o.user_id = u.id
  WHERE o.deleted_at IS NULL AND json_valid(pay.amount)
  GROUP BY u.name
  ORDER BY ca_encaisse DESC
  LIMIT 10
`).all();
console.table(ca);

db.close();
