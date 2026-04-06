import { getDb } from './database';

// ─── Helpers ──────────────────────────────────────────────

function parsePrice(priceJson: string | null): number {
  if (!priceJson) return 0;
  try {
    const parsed = JSON.parse(priceJson);
    return Number(parsed.amount || 0) / 100;
  } catch {
    return 0;
  }
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents);
}

// ─── Exécution des outils IA ──────────────────────────────

export async function executeToolCall(
  toolName: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const db = getDb();

  switch (toolName) {

    // ──── Clients ────

    case 'search_clients': {
      const q = `%${args.query}%`;
      return db.prepare(`
        SELECT c.id, p.first_name, p.last_name, p.email, p.phone_number, p.address, p.city, p.zip_code,
               c.created_at, c.origin_of_provenance, c.referral,
               u.name as vendeur
        FROM clients c
        LEFT JOIN people p ON c.customer_id = p.id
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.customer_type = 'App\\Models\\Person'
          AND (p.first_name LIKE ? OR p.last_name LIKE ? OR p.email LIKE ? OR p.phone_number LIKE ?
               OR (p.last_name || ' ' || p.first_name) LIKE ? OR (p.first_name || ' ' || p.last_name) LIKE ?)
        ORDER BY c.created_at DESC
        LIMIT 50
      `).all(q, q, q, q, q, q);
    }

    case 'get_client': {
      const client = db.prepare(`
        SELECT c.id, p.first_name, p.last_name, p.email, p.phone_number, p.phone2, p.address, p.city, p.zip_code,
               p.date_of_birth, p.place_of_birth, p.country, p.sex,
               c.created_at, c.origin_of_provenance, c.referral,
               u.name as vendeur, u.email as vendeur_email, u.tel as vendeur_tel
        FROM clients c
        LEFT JOIN people p ON c.customer_id = p.id
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.id = ? AND c.customer_type = 'App\\Models\\Person'
      `).get(args.client_id);
      if (!client) return { error: 'Client non trouvé' };
      return client;
    }

    case 'get_client_orders': {
      return db.prepare(`
        SELECT o.id, o.number, o.statuts as status, o.created_at, o.is_payed,
               pr.name as produit, pr.price as produit_price_json,
               u.name as vendeur,
               o.total_price, o.subtotal,
               (SELECT ROUND(SUM(CAST(json_extract(pay.amount, '$.amount') AS REAL)) / 100.0, 2)
                FROM payments pay WHERE pay.order_id = o.id AND json_valid(pay.amount)) as total_paye
        FROM orders o
        LEFT JOIN prestations pr ON o.prestation_id = pr.id
        LEFT JOIN users u ON o.user_id = u.id
        WHERE o.client_id = ? AND o.deleted_at IS NULL
        ORDER BY o.created_at DESC
      `).all(args.client_id);
    }

    case 'get_client_estimates': {
      return db.prepare(`
        SELECT o.id, o.number, o.statuts as status, o.created_at,
               pr.name as produit, pr.price as produit_price_json,
               u.name as vendeur
        FROM orders o
        LEFT JOIN prestations pr ON o.prestation_id = pr.id
        LEFT JOIN users u ON o.user_id = u.id
        WHERE o.client_id = ? AND o.deleted_at IS NULL AND o.state = 2
        ORDER BY o.created_at DESC
      `).all(args.client_id);
    }

    // ──── Commandes ────

    case 'search_orders': {
      let where = 'o.deleted_at IS NULL';
      const params: unknown[] = [];

      if (args.query) {
        where += ` AND (o.number LIKE ? OR p.first_name || ' ' || p.last_name LIKE ? OR pr.name LIKE ? OR o.statuts LIKE ?)`;
        const q = `%${args.query}%`;
        params.push(q, q, q, q);
      }
      if (args.status) {
        where += ` AND o.statuts = ?`;
        params.push(args.status);
      }
      if (args.date_from) {
        where += ` AND o.created_at >= ?`;
        params.push(args.date_from);
      }
      if (args.date_to) {
        where += ` AND o.created_at <= ?`;
        params.push(args.date_to + ' 23:59:59');
      }
      if (args.user_id) {
        where += ` AND o.user_id = ?`;
        params.push(args.user_id);
      }

      const total = db.prepare(`
        SELECT COUNT(*) as total FROM orders o
        LEFT JOIN clients c ON o.client_id = c.id
        LEFT JOIN people p ON c.customer_id = p.id
        LEFT JOIN prestations pr ON o.prestation_id = pr.id
        WHERE ${where}
      `).get(...params) as { total: number };

      const data = db.prepare(`
        SELECT o.id, o.number, o.statuts as status, o.created_at, o.is_payed,
               p.first_name || ' ' || p.last_name as client_name,
               pr.name as produit,
               u.name as vendeur,
               (SELECT ROUND(SUM(CAST(json_extract(pay.amount, '$.amount') AS REAL)) / 100.0, 2)
                FROM payments pay WHERE pay.order_id = o.id AND json_valid(pay.amount)) as total_paye
        FROM orders o
        LEFT JOIN clients c ON o.client_id = c.id
        LEFT JOIN people p ON c.customer_id = p.id
        LEFT JOIN prestations pr ON o.prestation_id = pr.id
        LEFT JOIN users u ON o.user_id = u.id
        WHERE ${where}
        ORDER BY o.created_at DESC
        LIMIT 50
      `).all(...params);

      return { data, total: total.total };
    }

    case 'get_order': {
      const order = db.prepare(`
        SELECT o.id, o.number, o.statuts as status, o.created_at, o.updated_at, o.is_payed,
               o.reason, o.deadline, o.vat, o.commission,
               p.first_name || ' ' || p.last_name as client_name, p.email as client_email, p.phone_number as client_phone,
               c.id as client_id,
               pr.name as produit, pr.price as produit_price_json,
               pr.conditions as produit_conditions, pr.required_documents as produit_documents,
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
      `).get(args.order_id);
      if (!order) return { error: 'Commande non trouvée' };

      const payments = db.prepare(`
        SELECT pay.id, pay.amount, pay.type, pay.created_at, u.name as encaisse_par
        FROM payments pay
        LEFT JOIN users u ON pay.user_id = u.id
        WHERE pay.order_id = ?
        ORDER BY pay.created_at
      `).all(args.order_id);

      const parsedPayments = payments.map((p: any) => ({
        ...p,
        montant: parsePrice(p.amount),
        montant_formatted: formatPrice(parsePrice(p.amount)),
      }));

      return { ...order, payments: parsedPayments };
    }

    case 'get_order_payments': {
      const payments = db.prepare(`
        SELECT pay.id, pay.amount, pay.type, pay.reason, pay.created_at,
               u.name as encaisse_par
        FROM payments pay
        LEFT JOIN users u ON pay.user_id = u.id
        WHERE pay.order_id = ?
        ORDER BY pay.created_at
      `).all(args.order_id);

      return payments.map((p: any) => ({
        ...p,
        montant: parsePrice(p.amount),
        montant_formatted: formatPrice(parsePrice(p.amount)),
      }));
    }

    case 'get_order_statuses': {
      const rows = db.prepare(`
        SELECT DISTINCT statuts as status, COUNT(*) as count
        FROM orders WHERE deleted_at IS NULL
        GROUP BY statuts ORDER BY count DESC
      `).all();
      return rows;
    }

    // ──── Produits ────

    case 'search_products': {
      let where = 'pr.deleted_at IS NULL';
      const params: unknown[] = [];

      if (args.query) {
        where += ` AND pr.name LIKE ?`;
        params.push(`%${args.query}%`);
      }
      if (args.family_id) {
        where += ` AND pr.family_id = ?`;
        params.push(args.family_id);
      }

      return db.prepare(`
        SELECT pr.id, pr.name, pr.price as price_json, pf.name as categorie,
               pr.is_archived
        FROM prestations pr
        LEFT JOIN prestations_families pf ON pr.family_id = pf.id
        WHERE ${where}
        ORDER BY pr.name
        LIMIT 50
      `).all(...params).map((p: any) => ({
        ...p,
        prix: parsePrice(p.price_json),
        prix_formatted: formatPrice(parsePrice(p.price_json)),
      }));
    }

    case 'get_product': {
      const product = db.prepare(`
        SELECT pr.id, pr.name, pr.price as price_json, pr.presentation, pr.conditions,
               pr.required_documents, pr.sales_arguments,
               pr.commission, pr.commission_rate, pr.is_archived,
               pf.name as categorie
        FROM prestations pr
        LEFT JOIN prestations_families pf ON pr.family_id = pf.id
        WHERE pr.id = ?
      `).get(args.product_id);
      if (!product) return { error: 'Produit non trouvé' };
      return { ...(product as any), prix: parsePrice((product as any).price_json), prix_formatted: formatPrice(parsePrice((product as any).price_json)) };
    }

    case 'get_categories': {
      let where = 'deleted_at IS NULL AND archived = 0';
      const params: unknown[] = [];

      if (args.query) {
        where += ` AND name LIKE ?`;
        params.push(`%${args.query}%`);
      }
      if (args.parent_id) {
        where += ` AND parent_family_id = ?`;
        params.push(args.parent_id);
      }

      return db.prepare(`
        SELECT id, name, parent_family_id FROM prestations_families
        WHERE ${where} ORDER BY name
      `).all(...params);
    }

    // ──── Utilisateurs / Vendeurs ────

    case 'get_users': {
      return db.prepare(`
        SELECT id, name, email, tel, job_title, is_active, created_at
        FROM users
        WHERE deleted_at IS NULL AND hidden = 0
        ORDER BY name
      `).all();
    }

    case 'get_user': {
      const user = db.prepare(`
        SELECT id, name, email, tel, emergency_tel, address, job_title, is_active, created_at
        FROM users WHERE id = ?
      `).get(args.user_id);
      if (!user) return { error: 'Utilisateur non trouvé' };

      const stats = db.prepare(`
        SELECT COUNT(*) as nb_commandes,
               SUM(CASE WHEN o.is_payed = 1 THEN 1 ELSE 0 END) as nb_payees,
               SUM(CASE WHEN o.statuts = 'Terminée' THEN 1 ELSE 0 END) as nb_terminees
        FROM orders o WHERE o.user_id = ? AND o.deleted_at IS NULL
      `).get(args.user_id);

      const ca = db.prepare(`
        SELECT ROUND(SUM(CAST(json_extract(pay.amount, '$.amount') AS REAL)) / 100.0, 2) as ca_total
        FROM payments pay
        JOIN orders o ON pay.order_id = o.id
        WHERE o.user_id = ? AND o.deleted_at IS NULL AND json_valid(pay.amount)
      `).get(args.user_id) as { ca_total: number | null };

      return { ...(user as any), ...(stats as any), ca_total: ca.ca_total || 0, ca_formatted: formatPrice(ca.ca_total || 0) };
    }

    // ──── Statistiques ────

    case 'get_ca': {
      let where = 'o.deleted_at IS NULL AND json_valid(pay.amount)';
      const params: unknown[] = [];

      if (args.date_from) { where += ` AND o.created_at >= ?`; params.push(args.date_from); }
      if (args.date_to) { where += ` AND o.created_at <= ?`; params.push(args.date_to + ' 23:59:59'); }
      if (args.user_id) { where += ` AND o.user_id = ?`; params.push(args.user_id); }

      const result = db.prepare(`
        SELECT COUNT(DISTINCT o.id) as nb_commandes,
               ROUND(SUM(CAST(json_extract(pay.amount, '$.amount') AS REAL)) / 100.0, 2) as ca_encaisse
        FROM payments pay
        JOIN orders o ON pay.order_id = o.id
        WHERE ${where}
      `).get(...params) as any;

      const nb_total = db.prepare(`
        SELECT COUNT(*) as total FROM orders o WHERE o.deleted_at IS NULL
          ${args.date_from ? 'AND o.created_at >= ?' : ''}
          ${args.date_to ? 'AND o.created_at <= ?' : ''}
          ${args.user_id ? 'AND o.user_id = ?' : ''}
      `).get(...params) as { total: number };

      return {
        nb_commandes_total: nb_total.total,
        nb_commandes_avec_paiement: result.nb_commandes || 0,
        ca_encaisse: result.ca_encaisse || 0,
        ca_formatted: formatPrice(result.ca_encaisse || 0),
      };
    }

    case 'get_top_vendors': {
      let where = 'o.deleted_at IS NULL AND json_valid(pay.amount)';
      const params: unknown[] = [];

      if (args.date_from) { where += ` AND o.created_at >= ?`; params.push(args.date_from); }
      if (args.date_to) { where += ` AND o.created_at <= ?`; params.push(args.date_to + ' 23:59:59'); }

      const limit = Number(args.limit) || 10;

      return db.prepare(`
        SELECT u.id, u.name as vendeur, COUNT(DISTINCT o.id) as nb_commandes,
               ROUND(SUM(CAST(json_extract(pay.amount, '$.amount') AS REAL)) / 100.0, 2) as ca_encaisse
        FROM payments pay
        JOIN orders o ON pay.order_id = o.id
        JOIN users u ON o.user_id = u.id
        WHERE ${where}
        GROUP BY u.id, u.name
        ORDER BY ca_encaisse DESC
        LIMIT ?
      `).all(...params, limit);
    }

    case 'get_orders_by_status': {
      let where = 'o.deleted_at IS NULL';
      const params: unknown[] = [];

      if (args.date_from) { where += ` AND o.created_at >= ?`; params.push(args.date_from); }
      if (args.date_to) { where += ` AND o.created_at <= ?`; params.push(args.date_to + ' 23:59:59'); }

      return db.prepare(`
        SELECT o.statuts as status, COUNT(*) as count
        FROM orders o WHERE ${where}
        GROUP BY o.statuts ORDER BY count DESC
      `).all(...params);
    }

    default:
      throw new Error(`Outil inconnu: ${toolName}`);
  }
}
