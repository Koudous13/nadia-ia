import { queryAll, queryOne } from './database';
import { safeSelect, listTables, describeTables } from './safe-sql';

const PERSON_TYPE = 'App\\Models\\Person';

// ─── Helpers ──────────────────────────────────────────────

function parsePrice(priceJson: unknown): number {
  if (!priceJson) return 0;
  try {
    const parsed = typeof priceJson === 'string' ? JSON.parse(priceJson) : priceJson;
    const amount = (parsed as { amount?: unknown } | null)?.amount;
    return Number(amount ?? 0) / 100;
  } catch {
    return 0;
  }
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
}

// ─── Exécution des outils IA ──────────────────────────────

export async function executeToolCall(
  toolName: string,
  args: Record<string, unknown>,
): Promise<unknown> {

  switch (toolName) {

    // ──── Clients ────

    case 'search_clients': {
      if (args.query) {
        const q = `%${args.query}%`;
        return queryAll(`
          SELECT c.id, p.first_name, p.last_name, p.email, p.phone_number, p.address, p.city, p.zip_code,
                 c.created_at, c.origin_of_provenance, c.referral,
                 u.name as vendeur
          FROM clients c
          LEFT JOIN people p ON c.customer_id = p.id
          LEFT JOIN users u ON c.user_id = u.id
          WHERE c.customer_type = ?
            AND (p.first_name LIKE ? OR p.last_name LIKE ? OR p.email LIKE ? OR p.phone_number LIKE ?
                 OR CONCAT(p.last_name, ' ', p.first_name) LIKE ? OR CONCAT(p.first_name, ' ', p.last_name) LIKE ?)
          ORDER BY c.created_at DESC
          LIMIT 50
        `, [PERSON_TYPE, q, q, q, q, q, q]);
      }
      return queryAll(`
        SELECT c.id, p.first_name, p.last_name, p.email, p.phone_number, p.address, p.city, p.zip_code,
               c.created_at, c.origin_of_provenance, c.referral,
               u.name as vendeur
        FROM clients c
        LEFT JOIN people p ON c.customer_id = p.id
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.customer_type = ?
        ORDER BY c.created_at DESC
        LIMIT 50
      `, [PERSON_TYPE]);
    }

    case 'get_client': {
      const client = await queryOne(`
        SELECT c.id, p.first_name, p.last_name, p.email, p.phone_number, p.phone2, p.address, p.city, p.zip_code,
               p.date_of_birth, p.place_of_birth, p.country, p.sex,
               c.created_at, c.origin_of_provenance, c.referral,
               u.name as vendeur, u.email as vendeur_email, u.tel as vendeur_tel
        FROM clients c
        LEFT JOIN people p ON c.customer_id = p.id
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.id = ? AND c.customer_type = ?
      `, [Number(args.client_id), PERSON_TYPE]);
      if (!client) return { error: 'Client non trouvé' };
      return client;
    }

    case 'get_client_orders': {
      return queryAll(`
        SELECT o.id, o.number, o.statuts as status, o.created_at, o.is_payed,
               pr.name as produit,
               u.name as vendeur,
               (SELECT ROUND(SUM(CAST(pay.amount->>'$.amount' AS DECIMAL(20,2))) / 100.0, 2)
                FROM payments pay WHERE pay.order_id = o.id) as total_paye
        FROM orders o
        LEFT JOIN prestations pr ON o.prestation_id = pr.id
        LEFT JOIN users u ON o.user_id = u.id
        WHERE o.client_id = ? AND o.deleted_at IS NULL
        ORDER BY o.created_at DESC
      `, [Number(args.client_id)]);
    }

    case 'get_client_estimates': {
      return queryAll(`
        SELECT o.id, o.number, o.statuts as status, o.created_at,
               pr.name as produit,
               u.name as vendeur
        FROM orders o
        LEFT JOIN prestations pr ON o.prestation_id = pr.id
        LEFT JOIN users u ON o.user_id = u.id
        WHERE o.client_id = ? AND o.deleted_at IS NULL AND o.state = 2
        ORDER BY o.created_at DESC
      `, [Number(args.client_id)]);
    }

    // ──── Commandes ────

    case 'search_orders': {
      const conditions: string[] = ['o.deleted_at IS NULL'];
      const params: unknown[] = [];

      if (args.query) {
        const q = `%${args.query}%`;
        conditions.push(`(o.number LIKE ? OR CONCAT(p.last_name, ' ', p.first_name) LIKE ? OR pr.name LIKE ? OR o.statuts LIKE ?)`);
        params.push(q, q, q, q);
      }
      if (args.status) {
        conditions.push(`o.statuts = ?`);
        params.push(args.status);
      }
      if (args.date_from) {
        conditions.push(`o.created_at >= ?`);
        params.push(args.date_from);
      }
      if (args.date_to) {
        conditions.push(`o.created_at <= ?`);
        params.push(args.date_to + ' 23:59:59');
      }
      if (args.user_id) {
        conditions.push(`o.user_id = ?`);
        params.push(Number(args.user_id));
      }

      const where = conditions.join(' AND ');

      const total = await queryOne(`
        SELECT COUNT(*) as total FROM orders o
        LEFT JOIN clients c ON o.client_id = c.id
        LEFT JOIN people p ON c.customer_id = p.id
        LEFT JOIN prestations pr ON o.prestation_id = pr.id
        WHERE ${where}
      `, params);

      const data = await queryAll(`
        SELECT o.id, o.number, o.statuts as status, o.created_at, o.is_payed,
               CONCAT(p.first_name, ' ', p.last_name) as client_name,
               pr.name as produit,
               u.name as vendeur,
               (SELECT ROUND(SUM(CAST(pay.amount->>'$.amount' AS DECIMAL(20,2))) / 100.0, 2)
                FROM payments pay WHERE pay.order_id = o.id) as total_paye
        FROM orders o
        LEFT JOIN clients c ON o.client_id = c.id
        LEFT JOIN people p ON c.customer_id = p.id
        LEFT JOIN prestations pr ON o.prestation_id = pr.id
        LEFT JOIN users u ON o.user_id = u.id
        WHERE ${where}
        ORDER BY o.created_at DESC
        LIMIT 50
      `, params);

      return { data, total: total?.total ?? 0 };
    }

    case 'get_order': {
      const order = await queryOne(`
        SELECT o.id, o.number, o.statuts as status, o.created_at, o.updated_at, o.is_payed,
               o.reason, o.deadline, o.vat, o.commission,
               CONCAT(p.first_name, ' ', p.last_name) as client_name, p.email as client_email, p.phone_number as client_phone,
               c.id as client_id,
               pr.name as produit,
               pf.name as categorie,
               u.name as vendeur, u.email as vendeur_email,
               uc.name as cree_par
        FROM orders o
        LEFT JOIN clients c ON o.client_id = c.id
        LEFT JOIN people p ON c.customer_id = p.id
        LEFT JOIN prestations pr ON o.prestation_id = pr.id
        LEFT JOIN prestations_families pf ON pr.family_id = pf.id
        LEFT JOIN users u ON o.user_id = u.id
        LEFT JOIN users uc ON o.created_by = uc.id
        WHERE o.id = ?
      `, [Number(args.order_id)]);
      if (!order) return { error: 'Commande non trouvée' };

      const payments = await queryAll(`
        SELECT pay.id, pay.amount, pay.type, pay.created_at, u.name as encaisse_par
        FROM payments pay
        LEFT JOIN users u ON pay.user_id = u.id
        WHERE pay.order_id = ?
        ORDER BY pay.created_at
      `, [Number(args.order_id)]);

      const parsedPayments = payments.map(p => ({
        ...p,
        montant: parsePrice(p.amount),
        montant_formatted: formatPrice(parsePrice(p.amount)),
      }));

      return { ...order, payments: parsedPayments };
    }

    case 'get_order_payments': {
      const payments = await queryAll(`
        SELECT pay.id, pay.amount, pay.type, pay.reason, pay.created_at,
               u.name as encaisse_par
        FROM payments pay
        LEFT JOIN users u ON pay.user_id = u.id
        WHERE pay.order_id = ?
        ORDER BY pay.created_at
      `, [Number(args.order_id)]);

      return payments.map(p => ({
        ...p,
        montant: parsePrice(p.amount),
        montant_formatted: formatPrice(parsePrice(p.amount)),
      }));
    }

    case 'get_order_statuses': {
      return queryAll(`
        SELECT statuts as status, COUNT(*) as count
        FROM orders WHERE deleted_at IS NULL
        GROUP BY statuts ORDER BY count DESC
      `);
    }

    // ──── Produits ────

    case 'search_products': {
      const conditions: string[] = ['pr.deleted_at IS NULL'];
      const params: unknown[] = [];

      if (args.query) {
        conditions.push(`pr.name LIKE ?`);
        params.push(`%${args.query}%`);
      }
      if (args.family_id) {
        conditions.push(`pr.family_id = ?`);
        params.push(Number(args.family_id));
      }

      const products = await queryAll(`
        SELECT pr.id, pr.name, pr.price as price_json, pf.name as categorie, pr.is_archived
        FROM prestations pr
        LEFT JOIN prestations_families pf ON pr.family_id = pf.id
        WHERE ${conditions.join(' AND ')}
        ORDER BY pr.name
        LIMIT 50
      `, params);

      return products.map(p => ({
        ...p,
        prix: parsePrice(p.price_json),
        prix_formatted: formatPrice(parsePrice(p.price_json)),
      }));
    }

    case 'get_product': {
      const product = await queryOne(`
        SELECT pr.id, pr.name, pr.price as price_json, pr.presentation, pr.conditions,
               pr.required_documents, pr.sales_arguments,
               pr.commission, pr.commission_rate, pr.is_archived,
               pf.name as categorie
        FROM prestations pr
        LEFT JOIN prestations_families pf ON pr.family_id = pf.id
        WHERE pr.id = ?
      `, [Number(args.product_id)]);
      if (!product) return { error: 'Produit non trouvé' };
      return { ...product, prix: parsePrice(product.price_json), prix_formatted: formatPrice(parsePrice(product.price_json)) };
    }

    case 'get_categories': {
      const conditions: string[] = ['deleted_at IS NULL', 'archived = 0'];
      const params: unknown[] = [];

      if (args.query) {
        conditions.push(`name LIKE ?`);
        params.push(`%${args.query}%`);
      }
      if (args.parent_id) {
        conditions.push(`parent_family_id = ?`);
        params.push(Number(args.parent_id));
      }

      return queryAll(`
        SELECT id, name, parent_family_id FROM prestations_families
        WHERE ${conditions.join(' AND ')} ORDER BY name
      `, params);
    }

    // ──── Utilisateurs / Vendeurs ────

    case 'get_users': {
      return queryAll(`
        SELECT id, name, email, tel, job_title, is_active, created_at
        FROM users
        WHERE deleted_at IS NULL AND hidden = 0
        ORDER BY name
      `);
    }

    case 'get_user': {
      const userId = Number(args.user_id);
      const user = await queryOne(`
        SELECT id, name, email, tel, emergency_tel, address, job_title, is_active, created_at
        FROM users WHERE id = ?
      `, [userId]);
      if (!user) return { error: 'Utilisateur non trouvé' };

      const stats = await queryOne(`
        SELECT COUNT(*) as nb_commandes,
               SUM(CASE WHEN o.is_payed = 1 THEN 1 ELSE 0 END) as nb_payees,
               SUM(CASE WHEN o.statuts = 'Terminée' THEN 1 ELSE 0 END) as nb_terminees
        FROM orders o WHERE o.user_id = ? AND o.deleted_at IS NULL
      `, [userId]);

      const ca = await queryOne(`
        SELECT ROUND(SUM(CAST(pay.amount->>'$.amount' AS DECIMAL(20,2))) / 100.0, 2) as ca_total
        FROM payments pay
        JOIN orders o ON pay.order_id = o.id
        WHERE o.user_id = ? AND o.deleted_at IS NULL
      `, [userId]);

      const caTotal = (ca?.ca_total as number) || 0;
      return { ...user, ...(stats || {}), ca_total: caTotal, ca_formatted: formatPrice(caTotal) };
    }

    // ──── Statistiques ────

    case 'get_ca': {
      const conditions: string[] = ['o.deleted_at IS NULL'];
      const params: unknown[] = [];

      if (args.date_from) { conditions.push(`o.created_at >= ?`); params.push(args.date_from); }
      if (args.date_to) { conditions.push(`o.created_at <= ?`); params.push(args.date_to + ' 23:59:59'); }
      if (args.user_id) { conditions.push(`o.user_id = ?`); params.push(Number(args.user_id)); }

      const where = conditions.join(' AND ');

      const result = await queryOne(`
        SELECT COUNT(DISTINCT o.id) as nb_commandes,
               ROUND(SUM(CAST(pay.amount->>'$.amount' AS DECIMAL(20,2))) / 100.0, 2) as ca_encaisse
        FROM payments pay
        JOIN orders o ON pay.order_id = o.id
        WHERE ${where}
      `, params);

      const condTotal: string[] = ['o.deleted_at IS NULL'];
      const paramsTotal: unknown[] = [];
      if (args.date_from) { condTotal.push(`o.created_at >= ?`); paramsTotal.push(args.date_from); }
      if (args.date_to) { condTotal.push(`o.created_at <= ?`); paramsTotal.push(args.date_to + ' 23:59:59'); }
      if (args.user_id) { condTotal.push(`o.user_id = ?`); paramsTotal.push(Number(args.user_id)); }

      const nbTotal = await queryOne(`SELECT COUNT(*) as total FROM orders o WHERE ${condTotal.join(' AND ')}`, paramsTotal);

      const caEncaisse = (result?.ca_encaisse as number) || 0;
      return {
        nb_commandes_total: nbTotal?.total ?? 0,
        nb_commandes_avec_paiement: result?.nb_commandes ?? 0,
        ca_encaisse: caEncaisse,
        ca_formatted: formatPrice(caEncaisse),
      };
    }

    case 'get_top_vendors': {
      const by = args.by === 'order_date' ? 'order_date' : 'payment_date';
      const dateCol = by === 'order_date' ? 'o.created_at' : 'pay.created_at';

      const conditions: string[] = ['o.deleted_at IS NULL'];
      const params: unknown[] = [];

      if (args.date_from) { conditions.push(`${dateCol} >= ?`); params.push(args.date_from); }
      if (args.date_to) { conditions.push(`${dateCol} <= ?`); params.push(args.date_to + ' 23:59:59'); }

      const limit = Number(args.limit) || 10;
      params.push(limit);

      return queryAll(`
        SELECT u.id, u.name as vendeur, COUNT(DISTINCT o.id) as nb_commandes,
               ROUND(SUM(CAST(pay.amount->>'$.amount' AS DECIMAL(20,2))) / 100.0, 2) as ca_encaisse
        FROM payments pay
        JOIN orders o ON pay.order_id = o.id
        JOIN users u ON o.user_id = u.id
        WHERE ${conditions.join(' AND ')}
        GROUP BY u.id, u.name
        ORDER BY ca_encaisse DESC
        LIMIT ?
      `, params);
    }

    case 'get_orders_by_status': {
      const conditions: string[] = ['o.deleted_at IS NULL'];
      const params: unknown[] = [];

      if (args.date_from) { conditions.push(`o.created_at >= ?`); params.push(args.date_from); }
      if (args.date_to) { conditions.push(`o.created_at <= ?`); params.push(args.date_to + ' 23:59:59'); }

      return queryAll(`
        SELECT o.statuts as status, COUNT(*) as count
        FROM orders o WHERE ${conditions.join(' AND ')}
        GROUP BY o.statuts ORDER BY count DESC
      `, params);
    }

    // ──── Performance vendeurs ────

    case 'get_vendors_performance': {
      const dateFrom = args.date_from ? String(args.date_from) : null;
      const dateTo = args.date_to ? String(args.date_to) + ' 23:59:59' : null;

      return queryAll(`
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
      `, [dateFrom, dateFrom, dateTo, dateTo, dateFrom, dateFrom, dateTo, dateTo]);
    }

    case 'get_orders_by_vendor_status': {
      const conditions: string[] = ['o.deleted_at IS NULL'];
      const params: unknown[] = [];

      if (args.date_from) { conditions.push(`o.created_at >= ?`); params.push(args.date_from); }
      if (args.date_to) { conditions.push(`o.created_at <= ?`); params.push(args.date_to + ' 23:59:59'); }
      if (args.status) { conditions.push(`o.statuts = ?`); params.push(args.status); }

      if (args.status) {
        return queryAll(`
          SELECT u.id, u.name AS vendeur, COUNT(*) AS count
          FROM orders o
          JOIN users u ON o.user_id = u.id
          WHERE ${conditions.join(' AND ')}
          GROUP BY u.id, u.name
          ORDER BY count DESC
        `, params);
      }

      return queryAll(`
        SELECT u.name AS vendeur, o.statuts AS status, COUNT(*) AS count
        FROM orders o
        JOIN users u ON o.user_id = u.id
        WHERE ${conditions.join(' AND ')}
        GROUP BY u.id, u.name, o.statuts
        ORDER BY u.name, count DESC
      `, params);
    }

    case 'get_vendor_chat_stats': {
      const dateFrom = args.date_from ? String(args.date_from) : null;
      const dateTo = args.date_to ? String(args.date_to) + ' 23:59:59' : null;
      const minResponses = Math.max(1, Number(args.min_responses) || 5);

      return queryAll(`
        WITH ranked AS (
          SELECT cm.conversation_id, cm.user_id AS author_id, cm.created_at AS msg_at,
                 LAG(cm.user_id)    OVER (PARTITION BY cm.conversation_id ORDER BY cm.created_at) AS prev_user_id,
                 LAG(cm.created_at) OVER (PARTITION BY cm.conversation_id ORDER BY cm.created_at) AS prev_at
          FROM conversation_messages cm
          WHERE cm.deleted_at IS NULL
            AND (? IS NULL OR cm.created_at >= ?)
            AND (? IS NULL OR cm.created_at <= ?)
        )
        SELECT u.id, u.name AS vendeur,
               COUNT(*) AS nb_reponses,
               ROUND(AVG(CASE WHEN TIMESTAMPDIFF(MINUTE, prev_at, msg_at) < 1440
                              THEN TIMESTAMPDIFF(MINUTE, prev_at, msg_at) END), 1) AS delai_moyen_min_sous24h,
               ROUND(AVG(TIMESTAMPDIFF(MINUTE, prev_at, msg_at)), 1) AS delai_moyen_min_brut
        FROM ranked r
        JOIN users u ON r.author_id = u.id
        WHERE prev_user_id IS NOT NULL
          AND prev_user_id <> r.author_id
          AND TIMESTAMPDIFF(MINUTE, prev_at, msg_at) >= 0
        GROUP BY u.id, u.name
        HAVING nb_reponses >= ?
        ORDER BY delai_moyen_min_sous24h ASC
      `, [dateFrom, dateFrom, dateTo, dateTo, minResponses]);
    }

    // ──── Escape hatch SQL ────

    case 'list_tables': {
      return listTables();
    }

    case 'describe_tables': {
      const raw = String(args.tables ?? '');
      const tables = raw.split(',').map((t) => t.trim()).filter(Boolean);
      return describeTables(tables);
    }

    case 'run_sql': {
      const sql = String(args.sql ?? '');
      return safeSelect(sql);
    }

    default:
      throw new Error(`Outil inconnu: ${toolName}`);
  }
}
