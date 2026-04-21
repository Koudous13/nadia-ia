import mysql from 'mysql2/promise';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const env = Object.fromEntries(
  readFileSync(join(process.cwd(), '.env.local'), 'utf8')
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

const q = async (sql, params = []) => (await pool.query(sql, params))[0];
const EUR = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);

function section(title) {
  console.log('\n' + '='.repeat(80));
  console.log(title);
  console.log('='.repeat(80));
}

// ─── Q1: Rapport de performance de tous les assistants ────────────────────
section('Q1 — Rapport de performance de tous les assistants (tous temps)');

const perf = await q(`
  SELECT u.id, u.name,
         COUNT(DISTINCT o.id)                                     AS nb_commandes,
         SUM(CASE WHEN o.statuts = 'Terminée' THEN 1 ELSE 0 END)  AS nb_terminees,
         SUM(CASE WHEN o.is_payed = 1 THEN 1 ELSE 0 END)          AS nb_payees,
         ROUND(IFNULL((SELECT SUM(CAST(pay.amount->>'$.amount' AS DECIMAL(20,2))) / 100
                       FROM payments pay
                       JOIN orders o2 ON pay.order_id = o2.id
                       WHERE o2.user_id = u.id AND o2.deleted_at IS NULL), 0), 2) AS ca_encaisse
  FROM users u
  LEFT JOIN orders o ON o.user_id = u.id AND o.deleted_at IS NULL
  WHERE u.deleted_at IS NULL AND u.hidden = 0
  GROUP BY u.id, u.name
  ORDER BY ca_encaisse DESC
`);

console.table(
  perf.map((r) => ({
    assistant: r.name,
    nb_cmd: r.nb_commandes,
    nb_terminees: r.nb_terminees,
    nb_payees: r.nb_payees,
    CA: EUR(r.ca_encaisse),
  }))
);

// ─── Q2: Assistant le plus rapide (espace d'échange historique) ───────────
section("Q2 — Assistant le plus 'rapide' (interprétation)");

console.log("⚠️  Aucune table 'chat/messages/conversations' dans le schéma analysé.");
console.log("    Pas de moyen de mesurer vitesse de réponse client.\n");

// Tables existantes
const tables = await q(
  `SELECT table_name FROM information_schema.tables
   WHERE table_schema = ? ORDER BY table_name`,
  [env.DB_NAME]
);
const names = tables.map((t) => t.TABLE_NAME || t.table_name);
const chatLike = names.filter((n) =>
  /chat|message|conversation|discussion|exchange|echange|historique/i.test(n)
);
console.log('Tables potentiellement liées :', chatLike.length ? chatLike : 'aucune');

// Meilleure approximation : délai entre created_at d'un client et sa 1re commande
const speed = await q(`
  SELECT u.name,
         COUNT(DISTINCT c.id) AS nb_clients,
         ROUND(AVG(TIMESTAMPDIFF(HOUR, c.created_at,
               (SELECT MIN(o.created_at) FROM orders o
                WHERE o.client_id = c.id AND o.deleted_at IS NULL))), 1) AS heures_avg_1re_cmd
  FROM clients c
  JOIN users u ON c.user_id = u.id
  WHERE c.customer_type = 'App\\\\Models\\\\Person'
    AND u.deleted_at IS NULL AND u.hidden = 0
    AND EXISTS (SELECT 1 FROM orders o WHERE o.client_id = c.id AND o.deleted_at IS NULL)
  GROUP BY u.id, u.name
  HAVING nb_clients >= 3
  ORDER BY heures_avg_1re_cmd ASC
  LIMIT 10
`);
console.log("\nProxy 'rapidité' = délai moyen client_created → 1re commande (heures), min 3 clients :");
console.table(speed);

// ─── Q3: Plus rentable mars 2025 vs mars 2026 ─────────────────────────────
section('Q3 — Assistant le plus rentable : mars 2025 vs mars 2026');

for (const [label, from, to] of [
  ['mars 2025', '2025-03-01', '2025-03-31 23:59:59'],
  ['mars 2026', '2026-03-01', '2026-03-31 23:59:59'],
]) {
  const top = await q(
    `
    SELECT u.id, u.name AS vendeur,
           COUNT(DISTINCT o.id) AS nb_commandes,
           ROUND(SUM(CAST(pay.amount->>'$.amount' AS DECIMAL(20,2))) / 100, 2) AS ca_encaisse
    FROM payments pay
    JOIN orders o ON pay.order_id = o.id
    JOIN users u ON o.user_id = u.id
    WHERE o.deleted_at IS NULL
      AND pay.created_at >= ? AND pay.created_at <= ?
    GROUP BY u.id, u.name
    ORDER BY ca_encaisse DESC
    LIMIT 5
  `,
    [from, to]
  );
  console.log(`\n▶ ${label} (CA encaissé sur les paiements datés de ce mois) :`);
  console.table(top.map((r) => ({ vendeur: r.vendeur, nb_cmd: r.nb_commandes, CA: EUR(r.ca_encaisse) })));
}

// Note: get_top_vendors du bot filtre sur o.created_at, pas pay.created_at
console.log('\n⚠️  Note : le tool `get_top_vendors` filtre sur o.created_at (date commande),');
console.log('    pas pay.created_at (date paiement). Résultats peuvent différer.');
for (const [label, from, to] of [
  ['mars 2025', '2025-03-01', '2025-03-31 23:59:59'],
  ['mars 2026', '2026-03-01', '2026-03-31 23:59:59'],
]) {
  const top = await q(
    `
    SELECT u.name AS vendeur,
           COUNT(DISTINCT o.id) AS nb_commandes,
           ROUND(SUM(CAST(pay.amount->>'$.amount' AS DECIMAL(20,2))) / 100, 2) AS ca_encaisse
    FROM payments pay
    JOIN orders o ON pay.order_id = o.id
    JOIN users u ON o.user_id = u.id
    WHERE o.deleted_at IS NULL
      AND o.created_at >= ? AND o.created_at <= ?
    GROUP BY u.id, u.name
    ORDER BY ca_encaisse DESC
    LIMIT 5
  `,
    [from, to]
  );
  console.log(`\n▶ ${label} — logique du bot (commandes créées dans le mois) :`);
  console.table(top.map((r) => ({ vendeur: r.vendeur, nb_cmd: r.nb_commandes, CA: EUR(r.ca_encaisse) })));
}

// ─── Q4: Classement par nombre d'attributions de missions (mars 2026) ─────
section('Q4 — Classement par nombre de missions attribuées (mars 2026)');

const assigned = await q(`
  SELECT u.name AS vendeur, COUNT(*) AS nb_missions_attribuees
  FROM orders o
  JOIN users u ON o.user_id = u.id
  WHERE o.deleted_at IS NULL
    AND o.created_at >= '2026-03-01' AND o.created_at <= '2026-03-31 23:59:59'
  GROUP BY u.id, u.name
  ORDER BY nb_missions_attribuees DESC
`);
console.table(assigned);
console.log(`Total attributions mars 2026 : ${assigned.reduce((s, r) => s + Number(r.nb_missions_attribuees), 0)}`);

// ─── Q5: Classement par commandes clôturées/finalisées ────────────────────
section('Q5 — Classement par commandes clôturées / finalisées');

const statuses = await q(`
  SELECT statuts AS status, COUNT(*) AS count
  FROM orders WHERE deleted_at IS NULL
  GROUP BY statuts ORDER BY count DESC
`);
console.log("Statuts existants dans la base :");
console.table(statuses);

const closed = await q(`
  SELECT u.name AS vendeur,
         SUM(CASE WHEN o.statuts = 'Terminée' THEN 1 ELSE 0 END) AS nb_terminees,
         COUNT(*) AS nb_total
  FROM orders o
  JOIN users u ON o.user_id = u.id
  WHERE o.deleted_at IS NULL
  GROUP BY u.id, u.name
  HAVING nb_terminees > 0
  ORDER BY nb_terminees DESC
`);
console.log("\nClassement par commandes 'Terminée' :");
console.table(closed);

await pool.end();
