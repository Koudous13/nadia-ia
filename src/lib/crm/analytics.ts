// Analytics tools — CA, performance, comparaisons, conversion
// Tous les montants sont retournés en euros (déjà divisés par 100).
// Convention: les paiements sont en JSON {amount, currency} stocké en cents.
//
// Sémantique des états (orders.state) :
//   1 = DEV  (devis, proposition non acceptée)
//   2 = BC   (bon de commande, accepté à facturer)
//   3 = FACT (facture émise)
// Cycle métier : DEV → BC → FACT.

import { queryAll, queryOne } from './database';

const PERSON_TYPE = 'App\\Models\\Person';
// CA facturé / "vraies commandes engageantes" : BC + facture
const BILLED_STATES = '(2,3)';
// Tout ce qui est encore actif : devis + BC + facture
const OPEN_STATES = '(1,2,3)';

// Périodes : produit un fragment SQL et les params
function periodSql(col: string, from?: string | null, to?: string | null) {
  const conds: string[] = [];
  const params: unknown[] = [];
  if (from) { conds.push(`${col} >= ?`); params.push(from); }
  if (to)   { conds.push(`${col} <= ?`); params.push(`${to} 23:59:59`); }
  return { sql: conds.length ? conds.join(' AND ') : '1=1', params };
}

const PAYMENT_AMOUNT = `CAST(pay.amount->>'$.amount' AS DECIMAL(20,2)) / 100`;
const ORDER_TOTAL   = `CAST(o.total_price->>'$.amount' AS DECIMAL(20,2)) / 100`;

// ───── CA ─────

export async function getCaByDay(args: { date_from?: string; date_to?: string }) {
  const { sql, params } = periodSql('pay.created_at', args.date_from, args.date_to);
  return queryAll(`
    SELECT DATE(pay.created_at) AS jour,
           ROUND(SUM(${PAYMENT_AMOUNT}), 2) AS ca_encaisse,
           COUNT(DISTINCT pay.id) AS nb_paiements,
           COUNT(DISTINCT pay.order_id) AS nb_commandes
    FROM payments pay
    LEFT JOIN orders o ON o.id = pay.order_id AND o.deleted_at IS NULL
    WHERE pay.created_at IS NOT NULL AND ${sql}
    GROUP BY DATE(pay.created_at)
    ORDER BY jour
  `, params);
}

export async function getCaFactured(args: {
  date_from?: string; date_to?: string;
  status?: string; status_in?: string[];
  exclude_cancelled?: string | boolean;
  user_id?: string;
}) {
  const conds: string[] = ['o.deleted_at IS NULL', `o.state IN ${BILLED_STATES}`];
  const params: unknown[] = [];
  if (args.date_from) { conds.push('o.created_at >= ?'); params.push(args.date_from); }
  if (args.date_to)   { conds.push('o.created_at <= ?'); params.push(`${args.date_to} 23:59:59`); }
  if (args.status)    { conds.push('o.statuts = ?');    params.push(args.status); }
  if (args.status_in?.length) {
    conds.push(`o.statuts IN (${args.status_in.map(() => '?').join(',')})`);
    params.push(...args.status_in);
  }
  if (args.exclude_cancelled === true || args.exclude_cancelled === 'true') {
    conds.push(`o.statuts <> 'Annulée'`);
  }
  if (args.user_id) { conds.push('o.user_id = ?'); params.push(Number(args.user_id)); }

  return queryOne(`
    SELECT COUNT(*) AS nb_commandes,
           ROUND(SUM(${ORDER_TOTAL}), 2) AS ca_facture
    FROM orders o
    WHERE ${conds.join(' AND ')}
  `, params);
}

export async function getCaSummary(args: { date_from?: string; date_to?: string }) {
  const f = await getCaFactured({ ...args, exclude_cancelled: 'true' });
  const period = periodSql('pay.created_at', args.date_from, args.date_to);
  const enc = await queryOne(`
    SELECT ROUND(SUM(${PAYMENT_AMOUNT}), 2) AS ca_encaisse,
           COUNT(DISTINCT pay.order_id) AS nb_commandes_payees
    FROM payments pay
    LEFT JOIN orders o ON o.id = pay.order_id AND o.deleted_at IS NULL
    WHERE ${period.sql}
  `, period.params);

  const facture = Number(f?.ca_facture) || 0;
  const encaisse = Number(enc?.ca_encaisse) || 0;
  return {
    ca_facture: facture,
    ca_encaisse: encaisse,
    restant_a_encaisser: Math.max(0, Math.round((facture - encaisse) * 100) / 100),
    nb_commandes_facturees: f?.nb_commandes ?? 0,
    nb_commandes_payees: enc?.nb_commandes_payees ?? 0,
    periode: { date_from: args.date_from || null, date_to: args.date_to || null },
  };
}

export async function getCaByPaymentType(args: {
  date_from?: string; date_to?: string; type?: string;
}) {
  const conds: string[] = [];
  const params: unknown[] = [];
  if (args.date_from) { conds.push('pay.created_at >= ?'); params.push(args.date_from); }
  if (args.date_to)   { conds.push('pay.created_at <= ?'); params.push(`${args.date_to} 23:59:59`); }
  if (args.type) {
    conds.push('TRIM(LOWER(pay.type)) = TRIM(LOWER(?))');
    params.push(args.type);
  }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  return queryAll(`
    SELECT TRIM(pay.type) AS type,
           COUNT(*) AS nb_paiements,
           ROUND(SUM(${PAYMENT_AMOUNT}), 2) AS total
    FROM payments pay
    ${where}
    GROUP BY TRIM(pay.type)
    ORDER BY total DESC
  `, params);
}

export async function getCaByPrestation(args: {
  date_from?: string; date_to?: string; limit?: string;
}) {
  const period = periodSql('pay.created_at', args.date_from, args.date_to);
  const limit = Math.min(Number(args.limit) || 20, 100);
  return queryAll(`
    SELECT pr.id, pr.name AS prestation,
           pf.name AS categorie,
           COUNT(DISTINCT pay.order_id) AS nb_commandes,
           ROUND(SUM(${PAYMENT_AMOUNT}), 2) AS ca_encaisse
    FROM payments pay
    JOIN orders o ON pay.order_id = o.id AND o.deleted_at IS NULL
    LEFT JOIN prestations pr ON o.prestation_id = pr.id
    LEFT JOIN prestations_families pf ON pr.family_id = pf.id
    WHERE ${period.sql}
    GROUP BY pr.id, pr.name, pf.name
    ORDER BY ca_encaisse DESC
    LIMIT ${limit}
  `, period.params);
}

export async function getCaByCategory(args: {
  date_from?: string; date_to?: string; limit?: string;
}) {
  const period = periodSql('pay.created_at', args.date_from, args.date_to);
  const limit = Math.min(Number(args.limit) || 20, 100);
  return queryAll(`
    SELECT pf.id, pf.name AS categorie,
           COUNT(DISTINCT pay.order_id) AS nb_commandes,
           ROUND(SUM(${PAYMENT_AMOUNT}), 2) AS ca_encaisse
    FROM payments pay
    JOIN orders o ON pay.order_id = o.id AND o.deleted_at IS NULL
    LEFT JOIN prestations pr ON o.prestation_id = pr.id
    LEFT JOIN prestations_families pf ON pr.family_id = pf.id
    WHERE ${period.sql}
    GROUP BY pf.id, pf.name
    ORDER BY ca_encaisse DESC
    LIMIT ${limit}
  `, period.params);
}

export async function comparePeriods(args: {
  from_a: string; to_a: string; from_b: string; to_b: string;
  metric?: 'ca_encaisse' | 'ca_facture' | 'nb_commandes';
}) {
  const a = periodSql('pay.created_at', args.from_a, args.to_a);
  const b = periodSql('pay.created_at', args.from_b, args.to_b);
  const [enc_a, enc_b] = await Promise.all([
    queryOne(`SELECT ROUND(SUM(${PAYMENT_AMOUNT}),2) AS ca_encaisse,
                     COUNT(DISTINCT pay.order_id) AS nb_commandes
              FROM payments pay JOIN orders o ON pay.order_id=o.id AND o.deleted_at IS NULL
              WHERE ${a.sql}`, a.params),
    queryOne(`SELECT ROUND(SUM(${PAYMENT_AMOUNT}),2) AS ca_encaisse,
                     COUNT(DISTINCT pay.order_id) AS nb_commandes
              FROM payments pay JOIN orders o ON pay.order_id=o.id AND o.deleted_at IS NULL
              WHERE ${b.sql}`, b.params),
  ]);
  const va = Number(enc_a?.ca_encaisse) || 0;
  const vb = Number(enc_b?.ca_encaisse) || 0;
  const delta = va - vb;
  const delta_pct = vb > 0 ? Math.round(((va - vb) / vb) * 1000) / 10 : null;
  return {
    periode_a: { from: args.from_a, to: args.to_a, ca_encaisse: va, nb_commandes: enc_a?.nb_commandes ?? 0 },
    periode_b: { from: args.from_b, to: args.to_b, ca_encaisse: vb, nb_commandes: enc_b?.nb_commandes ?? 0 },
    delta,
    delta_pct,
  };
}

export async function getAverageBasket(args: {
  date_from?: string; date_to?: string; by_user?: string | boolean;
}) {
  const conds: string[] = ['o.deleted_at IS NULL', `o.state IN ${BILLED_STATES}`, `o.statuts <> 'Annulée'`];
  const params: unknown[] = [];
  if (args.date_from) { conds.push('o.created_at >= ?'); params.push(args.date_from); }
  if (args.date_to)   { conds.push('o.created_at <= ?'); params.push(`${args.date_to} 23:59:59`); }

  if (args.by_user === true || args.by_user === 'true') {
    return queryAll(`
      SELECT u.id, u.name AS vendeur,
             COUNT(*) AS nb_commandes,
             ROUND(AVG(${ORDER_TOTAL}), 2) AS panier_moyen,
             ROUND(SUM(${ORDER_TOTAL}), 2) AS ca_facture
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE ${conds.join(' AND ')}
      GROUP BY u.id, u.name
      HAVING nb_commandes > 0
      ORDER BY panier_moyen DESC
    `, params);
  }

  return queryOne(`
    SELECT COUNT(*) AS nb_commandes,
           ROUND(AVG(${ORDER_TOTAL}), 2) AS panier_moyen,
           ROUND(SUM(${ORDER_TOTAL}), 2) AS ca_facture_total
    FROM orders o
    WHERE ${conds.join(' AND ')}
  `, params);
}

export async function getAveragePayment(args: { date_from?: string; date_to?: string }) {
  const period = periodSql('pay.created_at', args.date_from, args.date_to);
  return queryOne(`
    SELECT COUNT(*) AS nb_paiements,
           COUNT(DISTINCT pay.order_id) AS nb_commandes,
           ROUND(AVG(${PAYMENT_AMOUNT}), 2) AS paiement_moyen,
           ROUND(SUM(${PAYMENT_AMOUNT})/COUNT(DISTINCT pay.order_id), 2) AS moyen_par_commande
    FROM payments pay
    WHERE ${period.sql}
  `, period.params);
}

// ───── Performance avancée ─────

export async function getConversionRateByUser(args: { date_from?: string; date_to?: string }) {
  const conds: string[] = ['o.deleted_at IS NULL'];
  const params: unknown[] = [];
  if (args.date_from) { conds.push('o.created_at >= ?'); params.push(args.date_from); }
  if (args.date_to)   { conds.push('o.created_at <= ?'); params.push(`${args.date_to} 23:59:59`); }
  return queryAll(`
    SELECT u.id, u.name AS vendeur,
           SUM(CASE WHEN o.state IN (1,2) THEN 1 ELSE 0 END) AS nb_devis,
           SUM(CASE WHEN o.state = 3 THEN 1 ELSE 0 END) AS nb_factures,
           SUM(CASE WHEN o.quote_accepted_at IS NOT NULL THEN 1 ELSE 0 END) AS nb_devis_acceptes,
           ROUND(100 * SUM(CASE WHEN o.quote_accepted_at IS NOT NULL THEN 1 ELSE 0 END)
                     / NULLIF(COUNT(*), 0), 1) AS taux_conversion_pct
    FROM orders o
    JOIN users u ON o.user_id = u.id
    WHERE ${conds.join(' AND ')}
    GROUP BY u.id, u.name
    HAVING COUNT(*) >= 5
    ORDER BY taux_conversion_pct DESC
  `, params);
}

export async function getTopVendorsByPrestation(args: {
  prestation_keyword: string; date_from?: string; date_to?: string; limit?: string;
}) {
  const period = periodSql('pay.created_at', args.date_from, args.date_to);
  const limit = Math.min(Number(args.limit) || 10, 50);
  return queryAll(`
    SELECT u.id, u.name AS vendeur,
           COUNT(DISTINCT pay.order_id) AS nb_commandes,
           ROUND(SUM(${PAYMENT_AMOUNT}), 2) AS ca_encaisse
    FROM payments pay
    JOIN orders o ON pay.order_id = o.id AND o.deleted_at IS NULL
    JOIN users u ON o.user_id = u.id
    JOIN prestations pr ON o.prestation_id = pr.id
    WHERE pr.name LIKE CONCAT('%', ?, '%') AND ${period.sql}
    GROUP BY u.id, u.name
    ORDER BY ca_encaisse DESC
    LIMIT ${limit}
  `, [args.prestation_keyword, ...period.params]);
}

export async function getTopVendorsByFactured(args: {
  date_from?: string; date_to?: string; limit?: string;
}) {
  const conds: string[] = ['o.deleted_at IS NULL', `o.state IN ${BILLED_STATES}`, `o.statuts <> 'Annulée'`];
  const params: unknown[] = [];
  if (args.date_from) { conds.push('o.created_at >= ?'); params.push(args.date_from); }
  if (args.date_to)   { conds.push('o.created_at <= ?'); params.push(`${args.date_to} 23:59:59`); }
  const limit = Math.min(Number(args.limit) || 10, 50);
  return queryAll(`
    SELECT u.id, u.name AS vendeur,
           COUNT(*) AS nb_commandes,
           ROUND(SUM(${ORDER_TOTAL}), 2) AS ca_facture
    FROM orders o
    JOIN users u ON o.user_id = u.id
    WHERE ${conds.join(' AND ')}
    GROUP BY u.id, u.name
    ORDER BY ca_facture DESC
    LIMIT ${limit}
  `, params);
}

export async function getTopUsersByPaymentType(args: {
  type: string; date_from?: string; date_to?: string; limit?: string;
}) {
  const period = periodSql('pay.created_at', args.date_from, args.date_to);
  const limit = Math.min(Number(args.limit) || 10, 50);
  return queryAll(`
    SELECT u.id, u.name AS vendeur,
           COUNT(DISTINCT pay.order_id) AS nb_commandes,
           ROUND(SUM(${PAYMENT_AMOUNT}), 2) AS ca_encaisse
    FROM payments pay
    JOIN orders o ON pay.order_id = o.id AND o.deleted_at IS NULL
    JOIN users u ON o.user_id = u.id
    WHERE TRIM(LOWER(pay.type)) = TRIM(LOWER(?)) AND ${period.sql}
    GROUP BY u.id, u.name
    ORDER BY ca_encaisse DESC
    LIMIT ${limit}
  `, [args.type, ...period.params]);
}

export async function compareUsersPeriods(args: {
  from_a: string; to_a: string; from_b: string; to_b: string;
}) {
  const a = periodSql('pay.created_at', args.from_a, args.to_a);
  const b = periodSql('pay.created_at', args.from_b, args.to_b);
  return queryAll(`
    SELECT u.id, u.name AS vendeur,
           ROUND(IFNULL((
             SELECT SUM(${PAYMENT_AMOUNT}) FROM payments pay
             JOIN orders o ON pay.order_id=o.id AND o.deleted_at IS NULL
             WHERE o.user_id = u.id AND ${a.sql}
           ), 0), 2) AS ca_a,
           ROUND(IFNULL((
             SELECT SUM(${PAYMENT_AMOUNT}) FROM payments pay
             JOIN orders o ON pay.order_id=o.id AND o.deleted_at IS NULL
             WHERE o.user_id = u.id AND ${b.sql}
           ), 0), 2) AS ca_b
    FROM users u
    WHERE u.deleted_at IS NULL AND u.hidden = 0 AND u.is_active = 1
    HAVING ca_a > 0 OR ca_b > 0
    ORDER BY (ca_a - ca_b) DESC
  `, [...a.params, ...b.params]);
}

export async function getUserDailyAverage(args: { date_from?: string; date_to?: string }) {
  const period = periodSql('pay.created_at', args.date_from, args.date_to);
  return queryAll(`
    SELECT u.id, u.name AS vendeur,
           COUNT(DISTINCT DATE(pay.created_at)) AS jours_actifs,
           ROUND(SUM(${PAYMENT_AMOUNT}), 2) AS ca_total,
           ROUND(SUM(${PAYMENT_AMOUNT}) / NULLIF(COUNT(DISTINCT DATE(pay.created_at)),0), 2) AS ca_moyen_par_jour
    FROM payments pay
    JOIN orders o ON pay.order_id = o.id AND o.deleted_at IS NULL
    JOIN users u ON o.user_id = u.id
    WHERE ${period.sql}
    GROUP BY u.id, u.name
    HAVING jours_actifs > 0
    ORDER BY ca_moyen_par_jour DESC
  `, period.params);
}

export async function getVolumeVsDelayByUser() {
  return queryAll(`
    SELECT u.id, u.name AS vendeur,
           COUNT(*) AS nb_commandes,
           ROUND(IFNULL((
             SELECT SUM(${PAYMENT_AMOUNT}) FROM payments pay
             JOIN orders o2 ON pay.order_id=o2.id AND o2.deleted_at IS NULL
             WHERE o2.user_id = u.id
           ), 0), 2) AS ca_encaisse,
           ROUND(AVG(CASE WHEN o.statuts = 'Terminée' AND o.status_updated_at IS NOT NULL
                          THEN TIMESTAMPDIFF(DAY, o.created_at, o.status_updated_at) END), 1) AS delai_moyen_jours
    FROM orders o
    JOIN users u ON o.user_id = u.id
    WHERE o.deleted_at IS NULL AND u.is_active = 1
    GROUP BY u.id, u.name
    HAVING nb_commandes >= 10
    ORDER BY ca_encaisse DESC, delai_moyen_jours ASC
  `);
}

export async function getVolumeVsCancellationsByUser() {
  return queryAll(`
    SELECT u.id, u.name AS vendeur,
           COUNT(*) AS nb_commandes,
           SUM(CASE WHEN o.statuts = 'Annulée' THEN 1 ELSE 0 END) AS nb_annulees,
           ROUND(100 * SUM(CASE WHEN o.statuts = 'Annulée' THEN 1 ELSE 0 END) / COUNT(*), 1) AS taux_annul_pct,
           ROUND(IFNULL((
             SELECT SUM(${PAYMENT_AMOUNT}) FROM payments pay
             JOIN orders o2 ON pay.order_id=o2.id AND o2.deleted_at IS NULL
             WHERE o2.user_id = u.id
           ), 0), 2) AS ca_encaisse
    FROM orders o
    JOIN users u ON o.user_id = u.id
    WHERE o.deleted_at IS NULL AND u.is_active = 1
    GROUP BY u.id, u.name
    HAVING nb_commandes >= 10
    ORDER BY taux_annul_pct DESC
  `);
}

// ───── Comptages globaux (anti-hallucination) ─────

/**
 * Outil one-shot pour répondre à TOUTES les questions de type "combien de commandes…".
 * Pas besoin de sommer à la main une liste tronquée par le LLM — on calcule tout en SQL.
 */
export async function countOrders(args: {
  date_from?: string; date_to?: string; user_id?: string;
}) {
  const periodConds: string[] = ['o.deleted_at IS NULL'];
  const params: unknown[] = [];
  if (args.date_from) { periodConds.push('o.created_at >= ?'); params.push(args.date_from); }
  if (args.date_to)   { periodConds.push('o.created_at <= ?'); params.push(`${args.date_to} 23:59:59`); }
  if (args.user_id)   { periodConds.push('o.user_id = ?'); params.push(Number(args.user_id)); }
  const where = periodConds.join(' AND ');

  const summary = await queryOne(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN o.statuts IN ('Terminée','Annulée','Livrée','Expédié') THEN 1 ELSE 0 END) AS total_closed,
      SUM(CASE WHEN o.statuts NOT IN ('Terminée','Annulée','Livrée','Expédié') THEN 1 ELSE 0 END) AS total_open,
      SUM(CASE WHEN o.statuts NOT IN ('Terminée','Annulée','Livrée','Expédié')
                AND TIMESTAMPDIFF(DAY, o.created_at, NOW()) >= 30 THEN 1 ELSE 0 END) AS total_overdue_30d,
      SUM(CASE WHEN o.statuts NOT IN ('Terminée','Annulée','Livrée','Expédié')
                AND TIMESTAMPDIFF(DAY, o.created_at, NOW()) >= 90 THEN 1 ELSE 0 END) AS total_overdue_90d,
      SUM(CASE WHEN o.statuts = 'Terminée' THEN 1 ELSE 0 END) AS total_terminees,
      SUM(CASE WHEN o.statuts = 'Annulée' THEN 1 ELSE 0 END) AS total_annulees,
      SUM(CASE WHEN o.statuts = 'Attente de prise en charge' THEN 1 ELSE 0 END) AS total_attente_prise_en_charge,
      SUM(CASE WHEN o.is_payed = 1 THEN 1 ELSE 0 END) AS total_payees,
      SUM(CASE WHEN o.is_payed = 0 THEN 1 ELSE 0 END) AS total_non_payees,
      -- Breakdown par état :
      --   state=1 = DEV (devis non accepté)
      --   state=2 = BC  (bon de commande accepté)
      --   state=3 = FACT (facture émise)
      SUM(CASE WHEN o.state = 1 THEN 1 ELSE 0 END) AS total_devis,
      SUM(CASE WHEN o.state = 2 THEN 1 ELSE 0 END) AS total_bons_commande,
      SUM(CASE WHEN o.state = 3 THEN 1 ELSE 0 END) AS total_factures,
      SUM(CASE WHEN o.state IN (2,3) THEN 1 ELSE 0 END) AS total_commandes_engagees,
      SUM(CASE WHEN o.state IN (2,3) AND o.statuts NOT IN ('Terminée','Annulée','Livrée','Expédié') THEN 1 ELSE 0 END) AS total_open_billed,
      SUM(CASE WHEN o.state IN (2,3) AND o.statuts NOT IN ('Terminée','Annulée','Livrée','Expédié')
                AND TIMESTAMPDIFF(DAY, o.created_at, NOW()) >= 30 THEN 1 ELSE 0 END) AS total_overdue_30d_billed,
      SUM(CASE WHEN o.state = 1 AND o.statuts NOT IN ('Terminée','Annulée','Livrée','Expédié') THEN 1 ELSE 0 END) AS total_open_quotes,
      SUM(CASE WHEN o.state = 1 AND o.statuts NOT IN ('Terminée','Annulée','Livrée','Expédié')
                AND TIMESTAMPDIFF(DAY, o.created_at, NOW()) >= 30 THEN 1 ELSE 0 END) AS total_overdue_30d_quotes
    FROM orders o
    WHERE ${where}
  `, params);

  const byStatus = await queryAll(`
    SELECT o.statuts AS status, COUNT(*) AS n
    FROM orders o WHERE ${where}
    GROUP BY o.statuts ORDER BY n DESC
  `, params);

  return {
    periode: { date_from: args.date_from || 'début', date_to: args.date_to || "aujourd'hui", user_id: args.user_id || null },
    total: Number(summary?.total ?? 0),
    total_closed: Number(summary?.total_closed ?? 0),
    total_open: Number(summary?.total_open ?? 0),
    total_overdue_30d: Number(summary?.total_overdue_30d ?? 0),
    total_overdue_90d: Number(summary?.total_overdue_90d ?? 0),
    total_terminees: Number(summary?.total_terminees ?? 0),
    total_annulees: Number(summary?.total_annulees ?? 0),
    total_attente_prise_en_charge: Number(summary?.total_attente_prise_en_charge ?? 0),
    total_payees: Number(summary?.total_payees ?? 0),
    total_non_payees: Number(summary?.total_non_payees ?? 0),
    // Breakdown par état (DEV/BC/FACT)
    total_devis: Number(summary?.total_devis ?? 0),
    total_bons_commande: Number(summary?.total_bons_commande ?? 0),
    total_factures: Number(summary?.total_factures ?? 0),
    total_commandes_engagees: Number(summary?.total_commandes_engagees ?? 0),
    total_open_billed: Number(summary?.total_open_billed ?? 0),
    total_overdue_30d_billed: Number(summary?.total_overdue_30d_billed ?? 0),
    total_open_quotes: Number(summary?.total_open_quotes ?? 0),
    total_overdue_30d_quotes: Number(summary?.total_overdue_30d_quotes ?? 0),
    by_status: byStatus,
  };
}

// ───── Délai / Retards ─────

export async function getProcessingTimeByUser(args: {
  max_days?: string; min_days?: string; limit?: string; order?: 'ASC' | 'DESC';
}) {
  const order = args.order === 'DESC' ? 'DESC' : 'ASC';
  const limit = Math.min(Number(args.limit) || 30, 100);
  const having: string[] = ['nb_terminees > 0'];
  if (args.max_days) having.push(`delai_moyen_jours <= ${Number(args.max_days)}`);
  if (args.min_days) having.push(`delai_moyen_jours >= ${Number(args.min_days)}`);
  return queryAll(`
    SELECT u.id, u.name AS vendeur,
           COUNT(*) AS nb_terminees,
           ROUND(AVG(TIMESTAMPDIFF(DAY, o.created_at, o.status_updated_at)), 1) AS delai_moyen_jours,
           ROUND(MIN(TIMESTAMPDIFF(DAY, o.created_at, o.status_updated_at)), 1) AS delai_min,
           ROUND(MAX(TIMESTAMPDIFF(DAY, o.created_at, o.status_updated_at)), 1) AS delai_max
    FROM orders o
    JOIN users u ON o.user_id = u.id
    WHERE o.deleted_at IS NULL AND o.statuts = 'Terminée'
      AND o.status_updated_at IS NOT NULL AND u.is_active = 1
    GROUP BY u.id, u.name
    HAVING ${having.join(' AND ')}
    ORDER BY delai_moyen_jours ${order}
    LIMIT ${limit}
  `);
}

export async function getAverageProcessingTime() {
  return queryOne(`
    SELECT COUNT(*) AS nb_terminees,
           ROUND(AVG(TIMESTAMPDIFF(DAY, created_at, status_updated_at)), 1) AS delai_moyen_jours,
           ROUND(MIN(TIMESTAMPDIFF(DAY, created_at, status_updated_at)), 1) AS delai_min,
           ROUND(MAX(TIMESTAMPDIFF(DAY, created_at, status_updated_at)), 1) AS delai_max
    FROM orders
    WHERE deleted_at IS NULL AND statuts = 'Terminée' AND status_updated_at IS NOT NULL
  `);
}

const CLOSED_STATUSES = `('Terminée','Annulée','Livrée','Expédié')`;

export async function getOverdueOrders(args: {
  threshold_days?: string;
  exclude_closed?: string | boolean;
  min_amount?: string;
  group_by?: 'user' | 'client' | null;
  limit?: string;
}) {
  const days = Math.max(1, Number(args.threshold_days) || 30);
  // "En retard" = tout dossier ouvert (devis + BC + facture) > N jours non clos.
  // Inclure les devis traduit la sémantique métier "tout ce qui traîne".
  const conds: string[] = [
    'o.deleted_at IS NULL',
    `o.state IN ${OPEN_STATES}`,
    `TIMESTAMPDIFF(DAY, o.created_at, NOW()) >= ${days}`,
  ];
  if (args.exclude_closed === true || args.exclude_closed === 'true' || args.exclude_closed === undefined) {
    conds.push(`o.statuts NOT IN ${CLOSED_STATUSES}`);
  }
  if (args.min_amount) {
    conds.push(`${ORDER_TOTAL} >= ?`);
  }
  const params: unknown[] = [];
  if (args.min_amount) params.push(Number(args.min_amount));

  const limit = Math.min(Number(args.limit) || 50, 200);
  const where = conds.join(' AND ');

  // Toujours calculer le total + le CA bloqué global, indépendant du LIMIT
  const totalRow = await queryOne(`
    SELECT COUNT(*) AS total_count,
           ROUND(IFNULL(SUM(${ORDER_TOTAL}), 0), 2) AS ca_bloque_total
    FROM orders o WHERE ${where}
  `, params);
  const total_count = Number(totalRow?.total_count ?? 0);
  const ca_bloque_total = Number(totalRow?.ca_bloque_total ?? 0);

  if (args.group_by === 'user') {
    const data = await queryAll(`
      SELECT u.id, u.name AS vendeur,
             COUNT(*) AS nb_en_retard,
             ROUND(SUM(${ORDER_TOTAL}), 2) AS ca_bloque
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE ${where}
      GROUP BY u.id, u.name
      ORDER BY nb_en_retard DESC
      LIMIT ${limit}
    `, params);
    return { total_count, ca_bloque_total, threshold_days: days, group_by: 'user' as const, data };
  }
  if (args.group_by === 'client') {
    const data = await queryAll(`
      SELECT c.id AS client_id,
             CONCAT(p.first_name, ' ', p.last_name) AS client,
             COUNT(*) AS nb_en_retard,
             ROUND(SUM(${ORDER_TOTAL}), 2) AS ca_bloque
      FROM orders o
      LEFT JOIN clients c ON o.client_id = c.id
      LEFT JOIN people p ON c.customer_id = p.id
      WHERE ${where}
      GROUP BY c.id, p.first_name, p.last_name
      ORDER BY nb_en_retard DESC
      LIMIT ${limit}
    `, params);
    return { total_count, ca_bloque_total, threshold_days: days, group_by: 'client' as const, data };
  }
  const data = await queryAll(`
    SELECT o.id, o.number, o.statuts AS status,
           o.created_at,
           TIMESTAMPDIFF(DAY, o.created_at, NOW()) AS jours,
           ROUND(${ORDER_TOTAL}, 2) AS montant,
           u.name AS vendeur,
           CONCAT(p.first_name, ' ', p.last_name) AS client
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    LEFT JOIN clients c ON o.client_id = c.id
    LEFT JOIN people p ON c.customer_id = p.id
    WHERE ${where}
    ORDER BY jours DESC
    LIMIT ${limit}
  `, params);
  return {
    total_count, ca_bloque_total, threshold_days: days,
    sample_size: data.length, sample_truncated: total_count > data.length,
    data,
  };
}

const BLOCKED_STATUSES = `('Attente retour client (Prise en charge)','Attente retour client (En cours de traitement)','Attente réglement (Prise en charge)','Attente réglement (En cours de traitement)','Attente retour administration','Attente rendez-vous administratif','Attente validation hiérarchique')`;

export async function getOrdersBlocked(args: {
  min_amount?: string; group_by?: 'user' | 'client' | null; limit?: string;
}) {
  const conds: string[] = ['o.deleted_at IS NULL', `o.statuts IN ${BLOCKED_STATUSES}`];
  const params: unknown[] = [];
  if (args.min_amount) { conds.push(`${ORDER_TOTAL} >= ?`); params.push(Number(args.min_amount)); }
  const limit = Math.min(Number(args.limit) || 50, 200);
  const where = conds.join(' AND ');

  const totalRow = await queryOne(`
    SELECT COUNT(*) AS total_count,
           ROUND(IFNULL(SUM(${ORDER_TOTAL}), 0), 2) AS ca_bloque_total
    FROM orders o WHERE ${where}
  `, params);
  const total_count = Number(totalRow?.total_count ?? 0);
  const ca_bloque_total = Number(totalRow?.ca_bloque_total ?? 0);

  if (args.group_by === 'user') {
    const data = await queryAll(`
      SELECT u.id, u.name AS vendeur,
             COUNT(*) AS nb_bloquees,
             ROUND(SUM(${ORDER_TOTAL}), 2) AS ca_bloque
      FROM orders o LEFT JOIN users u ON o.user_id = u.id
      WHERE ${where}
      GROUP BY u.id, u.name ORDER BY nb_bloquees DESC LIMIT ${limit}
    `, params);
    return { total_count, ca_bloque_total, group_by: 'user' as const, data };
  }
  if (args.group_by === 'client') {
    const data = await queryAll(`
      SELECT c.id AS client_id, CONCAT(p.first_name, ' ', p.last_name) AS client,
             COUNT(*) AS nb_bloquees,
             ROUND(SUM(${ORDER_TOTAL}), 2) AS ca_bloque
      FROM orders o
      LEFT JOIN clients c ON o.client_id = c.id
      LEFT JOIN people p ON c.customer_id = p.id
      WHERE ${where}
      GROUP BY c.id, p.first_name, p.last_name ORDER BY nb_bloquees DESC LIMIT ${limit}
    `, params);
    return { total_count, ca_bloque_total, group_by: 'client' as const, data };
  }
  const data = await queryAll(`
    SELECT o.id, o.number, o.statuts AS status, o.created_at,
           TIMESTAMPDIFF(DAY, o.created_at, NOW()) AS jours,
           ROUND(${ORDER_TOTAL}, 2) AS montant,
           u.name AS vendeur,
           CONCAT(p.first_name, ' ', p.last_name) AS client
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    LEFT JOIN clients c ON o.client_id = c.id
    LEFT JOIN people p ON c.customer_id = p.id
    WHERE ${where}
    ORDER BY jours DESC LIMIT ${limit}
  `, params);
  return {
    total_count, ca_bloque_total,
    sample_size: data.length, sample_truncated: total_count > data.length,
    data,
  };
}

export async function getOrdersClosedOnDate(args: { date: string }) {
  return queryAll(`
    SELECT o.id, o.number, o.statuts AS status,
           o.created_at, o.status_updated_at,
           ROUND(${ORDER_TOTAL}, 2) AS montant,
           u.name AS vendeur,
           CONCAT(p.first_name, ' ', p.last_name) AS client
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    LEFT JOIN clients c ON o.client_id = c.id
    LEFT JOIN people p ON c.customer_id = p.id
    WHERE o.deleted_at IS NULL
      AND o.statuts = 'Terminée'
      AND DATE(o.status_updated_at) = ?
    ORDER BY o.status_updated_at
  `, [args.date]);
}

export async function getCaByPrestationAndPayment(args: {
  date_from?: string; date_to?: string; limit?: string;
}) {
  const period = periodSql('pay.created_at', args.date_from, args.date_to);
  const limit = Math.min(Number(args.limit) || 50, 200);
  return queryAll(`
    SELECT pr.name AS prestation,
           pf.name AS categorie,
           TRIM(pay.type) AS moyen_paiement,
           COUNT(DISTINCT pay.order_id) AS nb_commandes,
           ROUND(SUM(${PAYMENT_AMOUNT}), 2) AS ca_encaisse
    FROM payments pay
    JOIN orders o ON pay.order_id = o.id AND o.deleted_at IS NULL
    LEFT JOIN prestations pr ON o.prestation_id = pr.id
    LEFT JOIN prestations_families pf ON pr.family_id = pf.id
    WHERE ${period.sql}
    GROUP BY pr.id, pr.name, pf.name, TRIM(pay.type)
    ORDER BY ca_encaisse DESC
    LIMIT ${limit}
  `, period.params);
}

export async function getOrdersByPrestation(args: {
  date_from?: string; date_to?: string; limit?: string;
}) {
  const conds: string[] = ['o.deleted_at IS NULL'];
  const params: unknown[] = [];
  if (args.date_from) { conds.push('o.created_at >= ?'); params.push(args.date_from); }
  if (args.date_to)   { conds.push('o.created_at <= ?'); params.push(`${args.date_to} 23:59:59`); }
  const limit = Math.min(Number(args.limit) || 30, 100);
  return queryAll(`
    SELECT pr.id, pr.name AS prestation, pf.name AS categorie,
           COUNT(*) AS nb_commandes,
           SUM(CASE WHEN o.statuts = 'Terminée' THEN 1 ELSE 0 END) AS nb_terminees,
           SUM(CASE WHEN o.statuts = 'Annulée' THEN 1 ELSE 0 END) AS nb_annulees,
           ROUND(SUM(${ORDER_TOTAL}), 2) AS ca_facture
    FROM orders o
    LEFT JOIN prestations pr ON o.prestation_id = pr.id
    LEFT JOIN prestations_families pf ON pr.family_id = pf.id
    WHERE ${conds.join(' AND ')}
    GROUP BY pr.id, pr.name, pf.name
    ORDER BY nb_commandes DESC
    LIMIT ${limit}
  `, params);
}

export { PERSON_TYPE };
