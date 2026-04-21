// Charge les env, importe le module TS compilé via tsx ou re-crée le pool local.
// Ici on ré-implémente l'appel en exerçant les mêmes SQL que le handler.
import mysql from 'mysql2/promise';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const [k, ...rest] = l.split('=');
      return [k.trim(), rest.join('=').trim()];
    })
);

const pool = mysql.createPool({
  host: env.DB_HOST,
  port: Number(env.DB_PORT ?? 3306),
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  dateStrings: true,
  decimalNumbers: true,
});
const q = async (sql, p = []) => (await pool.query(sql, p))[0];
const EUR = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);

// ─── Test 1: get_vendors_performance(mars 2026) ────────────────────────────
console.log('\n▶ get_vendors_performance(2026-03-01 → 2026-03-31)');
const perf = await q(
  `
  SELECT u.id, u.name AS vendeur,
         COUNT(DISTINCT o.id) AS nb_commandes,
         SUM(CASE WHEN o.statuts = 'Terminée' THEN 1 ELSE 0 END) AS nb_terminees,
         SUM(CASE WHEN o.is_payed = 1 THEN 1 ELSE 0 END) AS nb_payees,
         ROUND(IFNULL((
           SELECT SUM(CAST(pay.amount->>'$.amount' AS DECIMAL(20,2))) / 100.0
           FROM payments pay
           JOIN orders o2 ON pay.order_id = o2.id
           WHERE o2.user_id = u.id AND o2.deleted_at IS NULL
             AND (? IS NULL OR pay.created_at >= ?)
             AND (? IS NULL OR pay.created_at <= ?)
         ), 0), 2) AS ca_encaisse
  FROM users u
  LEFT JOIN orders o ON o.user_id = u.id
    AND o.deleted_at IS NULL
    AND (? IS NULL OR o.created_at >= ?)
    AND (? IS NULL OR o.created_at <= ?)
  WHERE u.deleted_at IS NULL AND u.hidden = 0
  GROUP BY u.id, u.name
  HAVING nb_commandes > 0 OR ca_encaisse > 0
  ORDER BY ca_encaisse DESC, nb_commandes DESC
  LIMIT 10
`,
  ['2026-03-01', '2026-03-01', '2026-03-31 23:59:59', '2026-03-31 23:59:59',
   '2026-03-01', '2026-03-01', '2026-03-31 23:59:59', '2026-03-31 23:59:59']
);
console.table(perf.map((r) => ({ ...r, ca_encaisse: EUR(r.ca_encaisse) })));

// ─── Test 2: get_orders_by_vendor_status(status='Terminée') ───────────────
console.log("\n▶ get_orders_by_vendor_status(status='Terminée')");
const byStatus = await q(
  `
  SELECT u.name AS vendeur, COUNT(*) AS count
  FROM orders o JOIN users u ON o.user_id = u.id
  WHERE o.deleted_at IS NULL AND o.statuts = ?
  GROUP BY u.id, u.name
  ORDER BY count DESC
  LIMIT 10
`,
  ['Terminée']
);
console.table(byStatus);

// ─── Test 3: get_top_vendors(mars 2026, by=payment_date) ─────────────────
console.log('\n▶ get_top_vendors(mars 2026, by=payment_date)');
const topPay = await q(
  `
  SELECT u.id, u.name AS vendeur, COUNT(DISTINCT o.id) AS nb_commandes,
         ROUND(SUM(CAST(pay.amount->>'$.amount' AS DECIMAL(20,2))) / 100.0, 2) AS ca_encaisse
  FROM payments pay
  JOIN orders o ON pay.order_id = o.id
  JOIN users u ON o.user_id = u.id
  WHERE o.deleted_at IS NULL
    AND pay.created_at >= ? AND pay.created_at <= ?
  GROUP BY u.id, u.name
  ORDER BY ca_encaisse DESC
  LIMIT 5
`,
  ['2026-03-01', '2026-03-31 23:59:59']
);
console.table(topPay.map((r) => ({ ...r, ca_encaisse: EUR(r.ca_encaisse) })));

// ─── Test 4: get_vendor_chat_stats ───────────────────────────────────────
console.log('\n▶ get_vendor_chat_stats (tout temps, min 5 réponses)');
const chat = await q(
  `
  WITH ranked AS (
    SELECT cm.conversation_id, cm.user_id AS author_id, cm.created_at AS msg_at,
           LAG(cm.user_id)    OVER (PARTITION BY cm.conversation_id ORDER BY cm.created_at) AS prev_user_id,
           LAG(cm.created_at) OVER (PARTITION BY cm.conversation_id ORDER BY cm.created_at) AS prev_at
    FROM conversation_messages cm
    WHERE cm.deleted_at IS NULL
  )
  SELECT u.name AS vendeur,
         COUNT(*) AS nb_reponses,
         ROUND(AVG(CASE WHEN TIMESTAMPDIFF(MINUTE, prev_at, msg_at) < 1440
                        THEN TIMESTAMPDIFF(MINUTE, prev_at, msg_at) END), 1) AS delai_moyen_min_sous24h
  FROM ranked r JOIN users u ON r.author_id = u.id
  WHERE prev_user_id IS NOT NULL AND prev_user_id <> r.author_id
    AND TIMESTAMPDIFF(MINUTE, prev_at, msg_at) >= 0
  GROUP BY u.id, u.name
  HAVING nb_reponses >= 5
  ORDER BY delai_moyen_min_sous24h ASC
  LIMIT 5
`
);
console.table(chat);

// ─── Test 5: run_sql avec LIMIT manquant + hint timeout ───────────────────
console.log('\n▶ run_sql (test garde-fous) — requête valide');
{
  const sql = `SELECT COUNT(*) AS n FROM orders WHERE deleted_at IS NULL`;
  const withHint = `${sql} LIMIT 500`.replace(/^SELECT\b/i, `SELECT /*+ MAX_EXECUTION_TIME(10000) */`);
  console.log('  SQL final:', withHint);
  console.log('  Result:', await q(withHint));
}

console.log('\n▶ run_sql — injection DROP (doit échouer côté garde-fou applicatif)');
{
  const sql = 'DROP TABLE orders';
  const ok = /^(SELECT|WITH)\b/i.test(sql.trim());
  console.log('  starts with SELECT/WITH ?', ok);
  console.log('  → serait rejeté avec "Seules les requêtes SELECT/WITH sont autorisées."');
}

console.log('\n▶ run_sql — accès table bloquée password_resets');
{
  const sql = 'SELECT * FROM password_resets';
  const forbidden = /\bpassword_resets\b/i.test(sql);
  console.log('  table interdite détectée ?', forbidden);
}

await pool.end();
