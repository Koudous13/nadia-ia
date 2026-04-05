// Client HTTP pour l'API CRM Paperasse

const CRM_BASE_URL = process.env.CRM_API_URL || 'https://dev.paperasse.co/api';

async function crmFetch(path: string, userToken: string, params?: Record<string, string>) {
  const url = new URL(`${CRM_BASE_URL}${path}`);
  url.searchParams.set('key', userToken);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v) url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString(), {
    headers: { 'Accept': 'application/json' },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`CRM API error ${res.status}: ${body}`);
  }

  return res.json();
}

function buildParams(args: Record<string, unknown>, mapping: Record<string, string>): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [argKey, paramKey] of Object.entries(mapping)) {
    const val = args[argKey];
    if (val != null && val !== '') {
      params[paramKey] = String(val);
    }
  }
  return params;
}

// Mapping outil IA -> appel API CRM
export async function executeToolCall(
  toolName: string,
  args: Record<string, unknown>,
  userToken: string
): Promise<unknown> {
  switch (toolName) {
    // --- Clients ---
    case 'search_clients':
      return crmFetch('/search/clients', userToken, { s: String(args.query) });

    case 'get_client':
      return crmFetch(`/customers/show/${args.client_id}`, userToken);

    case 'get_client_orders':
      return crmFetch(`/customers/orders/${args.client_id}`, userToken);

    case 'get_client_estimates':
      return crmFetch(`/customers/estimates/${args.client_id}`, userToken);

    case 'get_all_clients':
      return crmFetch('/customers/index', userToken);

    // --- Commandes ---
    case 'search_orders':
      return crmFetch('/search/orders', userToken, { s: String(args.query) });

    case 'get_order':
      return crmFetch(`/orders/${args.order_id}/show`, userToken);

    case 'get_order_payments':
      return crmFetch(`/orders/${args.order_id}/payments`, userToken);

    case 'get_order_messages':
      return crmFetch(`/messages/${args.order_id}`, userToken, buildParams(args, { page: 'page' }));

    case 'get_order_statuses':
      return crmFetch('/orders/statues', userToken);

    // --- Produits ---
    case 'search_products':
      return crmFetch('/search/products', userToken, buildParams(args, { query: 's', family_id: 'family_id' }));

    case 'get_product':
      return crmFetch(`/products/${args.product_id}`, userToken);

    case 'get_categories':
      return crmFetch('/categories', userToken, buildParams(args, { query: 'q', parent_id: 'parent_id' }));

    // --- Utilisateurs ---
    case 'get_users':
      return crmFetch('/users', userToken);

    // --- Rendez-vous ---
    case 'get_appointments':
      return crmFetch(`/appointments/calendar/client/${args.client_id}`, userToken, buildParams(args, { date: 'date' }));

    case 'get_availability':
      return crmFetch(`/appointments/availability/${args.user_id}`, userToken, buildParams(args, { date: 'date' }));

    // --- Recherche globale ---
    case 'global_search':
      return crmFetch(`/search/${args.type}`, userToken, { s: String(args.query) });

    default:
      throw new Error(`Outil inconnu: ${toolName}`);
  }
}
