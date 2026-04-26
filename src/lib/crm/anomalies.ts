// Anomalies, paiements partiels, doublons, balances clients, devis non payés
import { queryAll, queryOne } from './database';

const PERSON_TYPE = 'App\\Models\\Person';
const FACTURED_STATES = '(1,3)';
const PAYMENT_AMOUNT = `CAST(pay.amount->>'$.amount' AS DECIMAL(20,2)) / 100`;
const ORDER_TOTAL    = `CAST(o.total_price->>'$.amount' AS DECIMAL(20,2)) / 100`;
const BLOCKED_STATUSES = `('Attente retour client (Prise en charge)','Attente retour client (En cours de traitement)','Attente réglement (Prise en charge)','Attente réglement (En cours de traitement)','Attente retour administration','Attente rendez-vous administratif','Attente validation hiérarchique')`;

// ───── Paiements partiels & balance ─────

export async function getPartialPayments(args: { limit?: string }) {
  const limit = Math.min(Number(args.limit) || 50, 200);
  return queryAll(`
    SELECT o.id, o.number, o.statuts AS status, o.created_at,
           ROUND(${ORDER_TOTAL}, 2) AS total_facture,
           ROUND(IFNULL(SUM(${PAYMENT_AMOUNT}), 0), 2) AS total_paye,
           ROUND(${ORDER_TOTAL} - IFNULL(SUM(${PAYMENT_AMOUNT}), 0), 2) AS reste_a_payer,
           u.name AS vendeur,
           CONCAT(p.first_name, ' ', p.last_name) AS client
    FROM orders o
    LEFT JOIN payments pay ON pay.order_id = o.id
    LEFT JOIN users u ON o.user_id = u.id
    LEFT JOIN clients c ON o.client_id = c.id
    LEFT JOIN people p ON c.customer_id = p.id
    WHERE o.deleted_at IS NULL
      AND o.state IN ${FACTURED_STATES}
      AND o.statuts <> 'Annulée'
      AND ${ORDER_TOTAL} > 0
    GROUP BY o.id, o.number, o.statuts, o.created_at, o.total_price, u.name, p.first_name, p.last_name
    HAVING total_paye > 0 AND total_paye < total_facture
    ORDER BY reste_a_payer DESC
    LIMIT ${limit}
  `);
}

export async function getOutstandingBalance(args: {
  date_from?: string; date_to?: string; user_id?: string;
}) {
  const conds: string[] = ['o.deleted_at IS NULL', `o.state IN ${FACTURED_STATES}`, `o.statuts <> 'Annulée'`];
  const params: unknown[] = [];
  if (args.date_from) { conds.push('o.created_at >= ?'); params.push(args.date_from); }
  if (args.date_to)   { conds.push('o.created_at <= ?'); params.push(`${args.date_to} 23:59:59`); }
  if (args.user_id)   { conds.push('o.user_id = ?'); params.push(Number(args.user_id)); }

  return queryOne(`
    SELECT COUNT(*) AS nb_commandes,
           ROUND(SUM(${ORDER_TOTAL}), 2) AS total_facture,
           ROUND(IFNULL((
             SELECT SUM(${PAYMENT_AMOUNT})
             FROM payments pay JOIN orders o2 ON pay.order_id=o2.id
             WHERE o2.deleted_at IS NULL AND o2.state IN ${FACTURED_STATES}
               AND o2.statuts <> 'Annulée'
               ${args.date_from ? 'AND o2.created_at >= ?' : ''}
               ${args.date_to ? 'AND o2.created_at <= ?' : ''}
               ${args.user_id ? 'AND o2.user_id = ?' : ''}
           ), 0), 2) AS total_encaisse,
           ROUND(SUM(${ORDER_TOTAL}) - IFNULL((
             SELECT SUM(${PAYMENT_AMOUNT})
             FROM payments pay JOIN orders o2 ON pay.order_id=o2.id
             WHERE o2.deleted_at IS NULL AND o2.state IN ${FACTURED_STATES}
               AND o2.statuts <> 'Annulée'
               ${args.date_from ? 'AND o2.created_at >= ?' : ''}
               ${args.date_to ? 'AND o2.created_at <= ?' : ''}
               ${args.user_id ? 'AND o2.user_id = ?' : ''}
           ), 0), 2) AS restant_a_encaisser
    FROM orders o
    WHERE ${conds.join(' AND ')}
  `, [...params, ...params, ...params]);
}

export async function getClientsWithBalance(args: { limit?: string }) {
  const limit = Math.min(Number(args.limit) || 50, 200);
  return queryAll(`
    SELECT c.id AS client_id,
           CONCAT(p.first_name, ' ', p.last_name) AS client,
           p.email, p.phone_number,
           u.name AS vendeur,
           COUNT(o.id) AS nb_commandes,
           ROUND(SUM(${ORDER_TOTAL}), 2) AS total_facture,
           ROUND(IFNULL(SUM(payed.total),0), 2) AS total_paye,
           ROUND(SUM(${ORDER_TOTAL}) - IFNULL(SUM(payed.total),0), 2) AS solde_du
    FROM clients c
    JOIN people p ON c.customer_id = p.id
    LEFT JOIN users u ON c.user_id = u.id
    JOIN orders o ON o.client_id = c.id AND o.deleted_at IS NULL
                  AND o.state IN ${FACTURED_STATES} AND o.statuts <> 'Annulée'
    LEFT JOIN (
      SELECT pay.order_id, SUM(${PAYMENT_AMOUNT}) AS total
      FROM payments pay GROUP BY pay.order_id
    ) payed ON payed.order_id = o.id
    WHERE c.customer_type = ?
    GROUP BY c.id, p.first_name, p.last_name, p.email, p.phone_number, u.name
    HAVING solde_du > 0.01
    ORDER BY solde_du DESC
    LIMIT ${limit}
  `, [PERSON_TYPE]);
}

// ───── Anomalies financières ─────

export async function getPaymentsWithoutOrder() {
  const r = await queryAll(`
    SELECT pay.id, pay.type, pay.created_at,
           ROUND(${PAYMENT_AMOUNT}, 2) AS montant,
           u.name AS encaisse_par
    FROM payments pay
    LEFT JOIN users u ON pay.user_id = u.id
    WHERE pay.order_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM orders o WHERE o.id = pay.order_id AND o.deleted_at IS NULL
    )
    ORDER BY pay.created_at DESC
    LIMIT 200
  `);
  return r;
}

export async function getOrdersWithoutPayment(args: {
  exclude_quotes?: string | boolean; date_from?: string; date_to?: string;
}) {
  const conds: string[] = ['o.deleted_at IS NULL', `o.statuts <> 'Annulée'`];
  if (args.exclude_quotes === true || args.exclude_quotes === 'true') {
    conds.push(`o.state IN ${FACTURED_STATES}`);
    conds.push(`o.state <> 2`);
  }
  const params: unknown[] = [];
  if (args.date_from) { conds.push('o.created_at >= ?'); params.push(args.date_from); }
  if (args.date_to)   { conds.push('o.created_at <= ?'); params.push(`${args.date_to} 23:59:59`); }

  return queryAll(`
    SELECT o.id, o.number, o.statuts AS status, o.created_at,
           TIMESTAMPDIFF(DAY, o.created_at, NOW()) AS jours,
           ROUND(${ORDER_TOTAL}, 2) AS montant,
           u.name AS vendeur,
           CONCAT(p.first_name, ' ', p.last_name) AS client
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    LEFT JOIN clients c ON o.client_id = c.id
    LEFT JOIN people p ON c.customer_id = p.id
    WHERE ${conds.join(' AND ')} AND NOT EXISTS (
      SELECT 1 FROM payments pay WHERE pay.order_id = o.id
    )
    ORDER BY o.created_at DESC
    LIMIT 100
  `, params);
}

export async function getOrdersPaidNotTreated(args: {
  payment_type?: string; group_by?: 'client' | null;
}) {
  const conds: string[] = [
    'o.deleted_at IS NULL',
    `o.statuts NOT IN ('Terminée','Annulée','Livrée','Expédié')`,
    'o.is_payed = 1',
  ];
  const params: unknown[] = [];
  if (args.payment_type) {
    conds.push(`EXISTS (SELECT 1 FROM payments pay WHERE pay.order_id=o.id AND TRIM(LOWER(pay.type))=TRIM(LOWER(?)))`);
    params.push(args.payment_type);
  }
  if (args.group_by === 'client') {
    return queryAll(`
      SELECT c.id AS client_id, CONCAT(p.first_name, ' ', p.last_name) AS client,
             p.email, COUNT(*) AS nb_commandes,
             ROUND(SUM(${ORDER_TOTAL}), 2) AS ca_concerne
      FROM orders o
      LEFT JOIN clients c ON o.client_id = c.id
      LEFT JOIN people p ON c.customer_id = p.id
      WHERE ${conds.join(' AND ')}
      GROUP BY c.id, p.first_name, p.last_name, p.email
      ORDER BY nb_commandes DESC
      LIMIT 100
    `, params);
  }
  return queryAll(`
    SELECT o.id, o.number, o.statuts AS status, o.created_at,
           TIMESTAMPDIFF(DAY, o.created_at, NOW()) AS jours,
           ROUND(${ORDER_TOTAL}, 2) AS montant,
           u.name AS vendeur,
           CONCAT(p.first_name, ' ', p.last_name) AS client
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    LEFT JOIN clients c ON o.client_id = c.id
    LEFT JOIN people p ON c.customer_id = p.id
    WHERE ${conds.join(' AND ')}
    ORDER BY o.created_at DESC
    LIMIT 100
  `, params);
}

export async function getOrdersCompletedNotPaid() {
  return queryAll(`
    SELECT o.id, o.number, o.statuts AS status, o.created_at, o.status_updated_at,
           ROUND(${ORDER_TOTAL}, 2) AS total_facture,
           ROUND(IFNULL((
             SELECT SUM(${PAYMENT_AMOUNT}) FROM payments pay WHERE pay.order_id = o.id
           ), 0), 2) AS total_paye,
           u.name AS vendeur,
           CONCAT(p.first_name, ' ', p.last_name) AS client
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    LEFT JOIN clients c ON o.client_id = c.id
    LEFT JOIN people p ON c.customer_id = p.id
    WHERE o.deleted_at IS NULL
      AND o.statuts = 'Terminée'
      AND o.is_payed = 0
      AND ${ORDER_TOTAL} > 0
    ORDER BY o.status_updated_at DESC
    LIMIT 100
  `);
}

export async function getInconsistentAmounts() {
  return queryAll(`
    SELECT o.id, o.number, o.statuts AS status, o.is_payed,
           ROUND(${ORDER_TOTAL}, 2) AS total_facture,
           ROUND(IFNULL(payed.total, 0), 2) AS total_paye,
           u.name AS vendeur,
           CASE
             WHEN o.is_payed = 1 AND IFNULL(payed.total, 0) = 0 AND ${ORDER_TOTAL} > 0
               THEN 'is_payed=1 mais aucun paiement enregistré'
             WHEN o.is_payed = 0 AND payed.total >= ${ORDER_TOTAL} AND ${ORDER_TOTAL} > 0
               THEN 'paiement complet mais is_payed=0'
             WHEN payed.total > ${ORDER_TOTAL} * 1.01
               THEN 'trop perçu (paiement > facturé)'
             ELSE NULL
           END AS anomalie
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    LEFT JOIN (
      SELECT pay.order_id, SUM(${PAYMENT_AMOUNT}) AS total
      FROM payments pay GROUP BY pay.order_id
    ) payed ON payed.order_id = o.id
    WHERE o.deleted_at IS NULL
      AND o.state IN ${FACTURED_STATES}
      AND ${ORDER_TOTAL} > 0
    HAVING anomalie IS NOT NULL
    ORDER BY total_facture DESC
    LIMIT 200
  `);
}

export async function getOrdersWithoutUser() {
  return queryAll(`
    SELECT o.id, o.number, o.statuts AS status, o.created_at,
           ROUND(${ORDER_TOTAL}, 2) AS montant
    FROM orders o
    WHERE o.deleted_at IS NULL AND (o.user_id IS NULL OR o.user_id = 0)
    ORDER BY o.created_at DESC
    LIMIT 100
  `);
}

export async function getOrdersWithoutPrestation() {
  return queryAll(`
    SELECT o.id, o.number, o.statuts AS status, o.created_at,
           ROUND(${ORDER_TOTAL}, 2) AS montant,
           u.name AS vendeur
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    WHERE o.deleted_at IS NULL AND (o.prestation_id IS NULL OR o.prestation_id = 0)
    ORDER BY o.created_at DESC
    LIMIT 100
  `);
}

// ───── Doublons ─────

export async function getDuplicateClients(args: { by?: 'email' | 'phone' }) {
  const by = args.by === 'phone' ? 'phone' : 'email';
  if (by === 'email') {
    return queryAll(`
      SELECT p.email,
             COUNT(*) AS nb_doublons,
             GROUP_CONCAT(c.id ORDER BY c.id) AS client_ids,
             GROUP_CONCAT(DISTINCT CONCAT(p.first_name, ' ', p.last_name) SEPARATOR ' | ') AS noms
      FROM clients c
      JOIN people p ON c.customer_id = p.id
      WHERE c.customer_type = ?
        AND p.email IS NOT NULL AND p.email <> ''
        AND TRIM(LOWER(p.email)) NOT IN ('nc','aucun','none','x@x.com','test@test.com')
        AND TRIM(LOWER(p.email)) NOT LIKE '%paperasse%'
      GROUP BY p.email
      HAVING nb_doublons > 1
      ORDER BY nb_doublons DESC
      LIMIT 50
    `, [PERSON_TYPE]);
  }
  return queryAll(`
    SELECT p.phone_number AS phone,
           COUNT(*) AS nb_doublons,
           GROUP_CONCAT(c.id ORDER BY c.id) AS client_ids,
           GROUP_CONCAT(DISTINCT CONCAT(p.first_name, ' ', p.last_name) SEPARATOR ' | ') AS noms
    FROM clients c
    JOIN people p ON c.customer_id = p.id
    WHERE c.customer_type = ?
      AND p.phone_number IS NOT NULL AND p.phone_number <> ''
      AND LENGTH(p.phone_number) >= 9
    GROUP BY p.phone_number
    HAVING nb_doublons > 1
    ORDER BY nb_doublons DESC
    LIMIT 50
  `, [PERSON_TYPE]);
}

export async function getDuplicatePayments() {
  return queryAll(`
    SELECT pay.order_id,
           pay.amount->>'$.amount' AS amount_cents,
           pay.type,
           DATE(pay.created_at) AS jour,
           COUNT(*) AS nb_doublons,
           GROUP_CONCAT(pay.id ORDER BY pay.id) AS payment_ids
    FROM payments pay
    WHERE pay.order_id IS NOT NULL
    GROUP BY pay.order_id, pay.amount->>'$.amount', pay.type, DATE(pay.created_at)
    HAVING nb_doublons > 1
    ORDER BY nb_doublons DESC, jour DESC
    LIMIT 50
  `);
}

// ───── Devis non payés / clients ─────

export async function getUnpaidQuotes(args: { min_amount?: string; limit?: string }) {
  const conds: string[] = ['o.deleted_at IS NULL', 'o.state IN (1,2)', `o.statuts <> 'Annulée'`];
  const params: unknown[] = [];
  if (args.min_amount) { conds.push(`${ORDER_TOTAL} >= ?`); params.push(Number(args.min_amount)); }
  const limit = Math.min(Number(args.limit) || 50, 200);
  return queryAll(`
    SELECT o.id, o.number, o.statuts AS status, o.created_at,
           TIMESTAMPDIFF(DAY, o.created_at, NOW()) AS jours_depuis,
           ROUND(${ORDER_TOTAL}, 2) AS montant,
           u.name AS vendeur,
           CONCAT(p.first_name, ' ', p.last_name) AS client,
           p.email, p.phone_number
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    LEFT JOIN clients c ON o.client_id = c.id
    LEFT JOIN people p ON c.customer_id = p.id
    WHERE ${conds.join(' AND ')} AND NOT EXISTS (
      SELECT 1 FROM payments pay WHERE pay.order_id = o.id
    )
    ORDER BY montant DESC
    LIMIT ${limit}
  `, params);
}

export async function getTopClients(args: {
  date_from?: string; date_to?: string; by?: 'ca' | 'orders'; limit?: string;
}) {
  const period = ['1=1'];
  const params: unknown[] = [];
  if (args.date_from) { period.push('pay.created_at >= ?'); params.push(args.date_from); }
  if (args.date_to)   { period.push('pay.created_at <= ?'); params.push(`${args.date_to} 23:59:59`); }
  const limit = Math.min(Number(args.limit) || 10, 100);
  const orderBy = args.by === 'orders' ? 'nb_commandes DESC' : 'ca_total DESC';
  return queryAll(`
    SELECT c.id AS client_id, CONCAT(p.first_name, ' ', p.last_name) AS client,
           p.email, p.phone_number,
           COUNT(DISTINCT pay.order_id) AS nb_commandes,
           ROUND(SUM(${PAYMENT_AMOUNT}), 2) AS ca_total
    FROM payments pay
    JOIN orders o ON pay.order_id = o.id AND o.deleted_at IS NULL
    JOIN clients c ON o.client_id = c.id AND c.customer_type = ?
    JOIN people p ON c.customer_id = p.id
    WHERE ${period.join(' AND ')}
    GROUP BY c.id, p.first_name, p.last_name, p.email, p.phone_number
    ORDER BY ${orderBy}
    LIMIT ${limit}
  `, [PERSON_TYPE, ...params]);
}

export async function getClientsWithMultipleOrders(args: { min?: string; limit?: string }) {
  const min = Math.max(2, Number(args.min) || 2);
  const limit = Math.min(Number(args.limit) || 50, 200);
  return queryAll(`
    SELECT c.id AS client_id, CONCAT(p.first_name, ' ', p.last_name) AS client,
           p.email, p.phone_number,
           COUNT(o.id) AS nb_commandes,
           ROUND(IFNULL(SUM(payed.total), 0), 2) AS ca_total,
           MIN(o.created_at) AS premiere_cmd,
           MAX(o.created_at) AS derniere_cmd
    FROM clients c
    JOIN people p ON c.customer_id = p.id
    JOIN orders o ON o.client_id = c.id AND o.deleted_at IS NULL
    LEFT JOIN (
      SELECT pay.order_id, SUM(${PAYMENT_AMOUNT}) AS total
      FROM payments pay GROUP BY pay.order_id
    ) payed ON payed.order_id = o.id
    WHERE c.customer_type = ?
    GROUP BY c.id, p.first_name, p.last_name, p.email, p.phone_number
    HAVING nb_commandes >= ${min}
    ORDER BY nb_commandes DESC, ca_total DESC
    LIMIT ${limit}
  `, [PERSON_TYPE]);
}

export async function getInactiveClients(args: { months?: string; limit?: string }) {
  const months = Math.max(1, Number(args.months) || 6);
  const limit = Math.min(Number(args.limit) || 50, 200);
  return queryAll(`
    SELECT c.id AS client_id, CONCAT(p.first_name, ' ', p.last_name) AS client,
           p.email, p.phone_number,
           u.name AS vendeur,
           MAX(o.created_at) AS derniere_cmd,
           TIMESTAMPDIFF(DAY, MAX(o.created_at), NOW()) AS jours_silence,
           COUNT(o.id) AS nb_commandes,
           ROUND(IFNULL(SUM(payed.total), 0), 2) AS ca_total
    FROM clients c
    JOIN people p ON c.customer_id = p.id
    LEFT JOIN users u ON c.user_id = u.id
    JOIN orders o ON o.client_id = c.id AND o.deleted_at IS NULL
    LEFT JOIN (
      SELECT pay.order_id, SUM(${PAYMENT_AMOUNT}) AS total
      FROM payments pay GROUP BY pay.order_id
    ) payed ON payed.order_id = o.id
    WHERE c.customer_type = ?
    GROUP BY c.id, p.first_name, p.last_name, p.email, p.phone_number, u.name
    HAVING TIMESTAMPDIFF(MONTH, derniere_cmd, NOW()) >= ${months}
        AND ca_total > 0
    ORDER BY ca_total DESC
    LIMIT ${limit}
  `, [PERSON_TYPE]);
}

export async function getTopUsersByClients(args: { limit?: string }) {
  const limit = Math.min(Number(args.limit) || 10, 50);
  return queryAll(`
    SELECT u.id, u.name AS vendeur,
           COUNT(*) AS nb_clients,
           SUM(CASE WHEN EXISTS (
             SELECT 1 FROM orders o JOIN payments pay ON pay.order_id=o.id
             WHERE o.client_id = c.id AND o.deleted_at IS NULL
           ) THEN 1 ELSE 0 END) AS nb_clients_payants,
           SUM(CASE WHEN NOT EXISTS (
             SELECT 1 FROM orders o JOIN payments pay ON pay.order_id=o.id
             WHERE o.client_id = c.id AND o.deleted_at IS NULL
           ) THEN 1 ELSE 0 END) AS nb_prospects
    FROM clients c
    JOIN users u ON c.user_id = u.id
    WHERE c.customer_type = ? AND u.is_active = 1
    GROUP BY u.id, u.name
    ORDER BY nb_prospects DESC
    LIMIT ${limit}
  `, [PERSON_TYPE]);
}

export async function getUnconvertedQuotesByUser(args: { limit?: string }) {
  const limit = Math.min(Number(args.limit) || 10, 50);
  return queryAll(`
    SELECT u.id, u.name AS vendeur,
           COUNT(*) AS nb_devis_non_convertis,
           ROUND(SUM(${ORDER_TOTAL}), 2) AS ca_potentiel
    FROM orders o
    JOIN users u ON o.user_id = u.id
    WHERE o.deleted_at IS NULL AND o.state IN (1,2)
      AND o.statuts <> 'Annulée'
      AND NOT EXISTS (SELECT 1 FROM payments pay WHERE pay.order_id = o.id)
    GROUP BY u.id, u.name
    ORDER BY nb_devis_non_convertis DESC
    LIMIT ${limit}
  `);
}

export async function getOrdersNeedingDocsByUser() {
  return queryAll(`
    SELECT u.id, u.name AS vendeur,
           COUNT(*) AS nb_dossiers_incomplets,
           ROUND(SUM(${ORDER_TOTAL}), 2) AS ca_concerne
    FROM orders o
    JOIN users u ON o.user_id = u.id
    WHERE o.deleted_at IS NULL AND o.needs_docs = 1
      AND o.statuts NOT IN ('Terminée','Annulée','Livrée','Expédié')
    GROUP BY u.id, u.name
    ORDER BY nb_dossiers_incomplets DESC
  `);
}

// ───── Reminders / Synthèse ─────

export async function getScheduledReminders(args: { date?: string }) {
  const date = args.date || new Date().toISOString().slice(0, 10);
  return queryAll(`
    SELECT sn.id, sn.send_at, sn.sent_at, sn.target_id AS user_id,
           u.name AS user_name,
           CASE
             WHEN sn.cancelled_at IS NOT NULL THEN 'annulée'
             WHEN sn.sent_at IS NOT NULL THEN 'envoyée'
             ELSE 'en attente'
           END AS statut
    FROM scheduled_notifications sn
    LEFT JOIN users u ON u.id = CAST(sn.target_id AS UNSIGNED)
    WHERE DATE(sn.send_at) = ?
      AND sn.target_type LIKE '%User%'
    ORDER BY sn.send_at
    LIMIT 200
  `, [date]);
}

export async function getMonthlySummary(args: { year?: string; month?: string }) {
  const now = new Date();
  const year = Number(args.year) || now.getFullYear();
  const month = Number(args.month) || (now.getMonth() + 1);
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const monthEnd = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

  const [encaisse, facture, ordersStats, topUser, topPresta] = await Promise.all([
    queryOne(`
      SELECT COUNT(DISTINCT pay.order_id) AS nb_cmd_payees,
             ROUND(SUM(${PAYMENT_AMOUNT}), 2) AS ca_encaisse
      FROM payments pay JOIN orders o ON pay.order_id=o.id AND o.deleted_at IS NULL
      WHERE pay.created_at BETWEEN ? AND ?
    `, [monthStart, `${monthEnd} 23:59:59`]),
    queryOne(`
      SELECT COUNT(*) AS nb_cmd, ROUND(SUM(${ORDER_TOTAL}), 2) AS ca_facture,
             SUM(CASE WHEN o.statuts='Annulée' THEN 1 ELSE 0 END) AS nb_annulees
      FROM orders o
      WHERE o.deleted_at IS NULL AND o.state IN ${FACTURED_STATES}
        AND o.created_at BETWEEN ? AND ?
    `, [monthStart, `${monthEnd} 23:59:59`]),
    queryAll(`
      SELECT statuts AS status, COUNT(*) AS n
      FROM orders WHERE deleted_at IS NULL
        AND created_at BETWEEN ? AND ?
      GROUP BY statuts ORDER BY n DESC LIMIT 5
    `, [monthStart, `${monthEnd} 23:59:59`]),
    queryOne(`
      SELECT u.name AS vendeur, ROUND(SUM(${PAYMENT_AMOUNT}), 2) AS ca
      FROM payments pay JOIN orders o ON pay.order_id=o.id AND o.deleted_at IS NULL
      JOIN users u ON o.user_id = u.id
      WHERE pay.created_at BETWEEN ? AND ?
      GROUP BY u.id, u.name ORDER BY ca DESC LIMIT 1
    `, [monthStart, `${monthEnd} 23:59:59`]),
    queryOne(`
      SELECT pr.name AS prestation, ROUND(SUM(${PAYMENT_AMOUNT}), 2) AS ca
      FROM payments pay JOIN orders o ON pay.order_id=o.id AND o.deleted_at IS NULL
      JOIN prestations pr ON o.prestation_id = pr.id
      WHERE pay.created_at BETWEEN ? AND ?
      GROUP BY pr.id, pr.name ORDER BY ca DESC LIMIT 1
    `, [monthStart, `${monthEnd} 23:59:59`]),
  ]);

  return {
    periode: { from: monthStart, to: monthEnd, mois: month, annee: year },
    ca_encaisse: encaisse,
    ca_facture: facture,
    statuts_top5: ordersStats,
    top_vendeur: topUser,
    top_prestation: topPresta,
  };
}

export async function getLossAnalysis() {
  const annulees = await queryOne(`
    SELECT COUNT(*) AS nb,
           ROUND(SUM(${ORDER_TOTAL}), 2) AS ca_perdu
    FROM orders o
    WHERE o.deleted_at IS NULL AND o.statuts = 'Annulée'
      AND o.created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
  `);
  const restant = await queryOne(`
    SELECT COUNT(*) AS nb,
           ROUND(SUM(${ORDER_TOTAL} - IFNULL(payed.total, 0)), 2) AS restant
    FROM orders o
    LEFT JOIN (
      SELECT pay.order_id, SUM(${PAYMENT_AMOUNT}) AS total
      FROM payments pay GROUP BY pay.order_id
    ) payed ON payed.order_id = o.id
    WHERE o.deleted_at IS NULL AND o.state IN ${FACTURED_STATES}
      AND o.statuts NOT IN ('Annulée') AND ${ORDER_TOTAL} > IFNULL(payed.total, 0)
  `);
  const devisNonConvertis = await queryOne(`
    SELECT COUNT(*) AS nb,
           ROUND(SUM(${ORDER_TOTAL}), 2) AS ca_potentiel
    FROM orders o
    WHERE o.deleted_at IS NULL AND o.state IN (1,2)
      AND o.statuts <> 'Annulée'
      AND NOT EXISTS (SELECT 1 FROM payments pay WHERE pay.order_id = o.id)
      AND o.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
  `);
  return {
    annulations_12mois: annulees,
    restant_a_encaisser: restant,
    devis_non_convertis_6mois: devisNonConvertis,
  };
}

export async function getTimeLossAnalysis() {
  const blocked = await queryOne(`
    SELECT COUNT(*) AS nb,
           ROUND(AVG(TIMESTAMPDIFF(DAY, o.created_at, NOW())), 1) AS jours_moyen
    FROM orders o
    WHERE o.deleted_at IS NULL AND o.statuts IN ${BLOCKED_STATUSES}
  `);
  const slowUsers = await queryAll(`
    SELECT u.name AS vendeur,
           ROUND(AVG(TIMESTAMPDIFF(DAY, o.created_at, o.status_updated_at)), 1) AS delai_moyen
    FROM orders o JOIN users u ON o.user_id = u.id
    WHERE o.deleted_at IS NULL AND o.statuts = 'Terminée'
      AND o.status_updated_at IS NOT NULL AND u.is_active = 1
    GROUP BY u.id, u.name
    HAVING COUNT(*) >= 10
    ORDER BY delai_moyen DESC LIMIT 5
  `);
  const oldOrders = await queryOne(`
    SELECT COUNT(*) AS nb_dossiers_anciens
    FROM orders o
    WHERE o.deleted_at IS NULL
      AND o.statuts NOT IN ('Terminée','Annulée','Livrée','Expédié')
      AND TIMESTAMPDIFF(DAY, o.created_at, NOW()) >= 90
  `);
  return {
    dossiers_bloques: blocked,
    vendeurs_les_plus_lents: slowUsers,
    dossiers_de_plus_de_90j: oldOrders,
  };
}
