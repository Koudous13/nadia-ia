/**
 * Script de test pour toutes les routes de l'API CRM Paperasse
 *
 * Usage:
 *   npx tsx scripts/test-crm-api.ts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Charger .env.local manuellement (pas besoin de dotenv)
const envPath = resolve(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx === -1) continue;
  const key = trimmed.slice(0, idx).trim();
  const value = trimmed.slice(idx + 1).trim();
  if (!process.env[key]) process.env[key] = value;
}

const BASE_URL = process.env.CRM_API_URL || 'https://dev.paperasse.co/api';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const USER_TOKEN = process.env.CRM_USER_TOKEN;

if (!USER_TOKEN) {
  console.error('❌ Variable CRM_USER_TOKEN manquante.');
  console.error('   Usage: CRM_USER_TOKEN=xxx npx tsx scripts/test-crm-api.ts');
  process.exit(1);
}

// ─── Helpers ──────────────────────────────────────────────

interface TestResult {
  name: string;
  route: string;
  status: number | null;
  ok: boolean;
  duration: number;
  error?: string;
  dataPreview?: unknown;
}

async function crmGet(
  path: string,
  params: Record<string, string> = {}
): Promise<{ status: number; ok: boolean; data: unknown }> {
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set('key', USER_TOKEN!);
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });

  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return { status: res.status, ok: res.ok, data };
}

function preview(data: unknown): unknown {
  if (Array.isArray(data)) {
    return `[Array: ${data.length} éléments]`;
  }
  if (data && typeof data === 'object') {
    const keys = Object.keys(data);
    if (keys.length > 8) return `{Object: clés = ${keys.slice(0, 8).join(', ')}, ...}`;
    return `{Object: clés = ${keys.join(', ')}}`;
  }
  return data;
}

// ─── Définition des tests ─────────────────────────────────

// IDs dynamiques récupérés au fur et à mesure
let clientId: string | null = null;
let orderId: string | null = null;
let productId: string | null = null;
let userId: string | null = null;

interface TestDef {
  name: string;
  route: string;
  run: () => Promise<{ status: number; ok: boolean; data: unknown }>;
  extractIds?: (data: unknown) => void;
}

const tests: TestDef[] = [
  // ──── Clients ────
  {
    name: 'Lister tous les clients',
    route: 'GET /customers/index',
    run: () => crmGet('/customers/index'),
    extractIds: (data) => {
      const arr = Array.isArray(data) ? data : (data as any)?.data;
      if (Array.isArray(arr) && arr.length > 0) {
        clientId = String(arr[0].id ?? arr[0].client_id ?? arr[0].ID);
      }
    },
  },
  {
    name: 'Rechercher un client',
    route: 'GET /search/clients?s=test',
    run: () => crmGet('/search/clients', { s: 'test' }),
    extractIds: (data) => {
      const arr = Array.isArray(data) ? data : (data as any)?.data;
      if (Array.isArray(arr) && arr.length > 0 && !clientId) {
        clientId = String(arr[0].id ?? arr[0].client_id);
      }
    },
  },
  {
    name: 'Détails d\'un client',
    route: 'GET /customers/show/{client_id}',
    run: () => {
      if (!clientId) return Promise.resolve({ status: 0, ok: false, data: 'SKIP: pas de client_id' });
      return crmGet(`/customers/show/${clientId}`);
    },
  },
  {
    name: 'Commandes d\'un client',
    route: 'GET /customers/orders/{client_id}',
    run: () => {
      if (!clientId) return Promise.resolve({ status: 0, ok: false, data: 'SKIP: pas de client_id' });
      return crmGet(`/customers/orders/${clientId}`);
    },
    extractIds: (data) => {
      const arr = Array.isArray(data) ? data : (data as any)?.data;
      if (Array.isArray(arr) && arr.length > 0 && !orderId) {
        orderId = String(arr[0].id ?? arr[0].order_id ?? arr[0].ID);
      }
    },
  },
  {
    name: 'Devis d\'un client',
    route: 'GET /customers/estimates/{client_id}',
    run: () => {
      if (!clientId) return Promise.resolve({ status: 0, ok: false, data: 'SKIP: pas de client_id' });
      return crmGet(`/customers/estimates/${clientId}`);
    },
  },

  // ──── Commandes ────
  {
    name: 'Rechercher des commandes',
    route: 'GET /search/orders?s=test',
    run: () => crmGet('/search/orders', { s: 'test' }),
    extractIds: (data) => {
      const arr = Array.isArray(data) ? data : (data as any)?.data;
      if (Array.isArray(arr) && arr.length > 0 && !orderId) {
        orderId = String(arr[0].id ?? arr[0].order_id);
      }
    },
  },
  {
    name: 'Détails d\'une commande',
    route: 'GET /orders/{order_id}/show',
    run: () => {
      if (!orderId) return Promise.resolve({ status: 0, ok: false, data: 'SKIP: pas de order_id' });
      return crmGet(`/orders/${orderId}/show`);
    },
  },
  {
    name: 'Paiements d\'une commande',
    route: 'GET /orders/{order_id}/payments',
    run: () => {
      if (!orderId) return Promise.resolve({ status: 0, ok: false, data: 'SKIP: pas de order_id' });
      return crmGet(`/orders/${orderId}/payments`);
    },
  },
  {
    name: 'Messages d\'une commande',
    route: 'GET /messages/{order_id}',
    run: () => {
      if (!orderId) return Promise.resolve({ status: 0, ok: false, data: 'SKIP: pas de order_id' });
      return crmGet(`/messages/${orderId}`, { page: '1' });
    },
  },
  {
    name: 'Statuts de commandes',
    route: 'GET /orders/statues',
    run: () => crmGet('/orders/statues'),
  },

  // ──── Produits ────
  {
    name: 'Rechercher des produits',
    route: 'GET /search/products?s=test',
    run: () => crmGet('/search/products', { s: 'test' }),
    extractIds: (data) => {
      const arr = Array.isArray(data) ? data : (data as any)?.data;
      if (Array.isArray(arr) && arr.length > 0) {
        productId = String(arr[0].id ?? arr[0].product_id);
      }
    },
  },
  {
    name: 'Détails d\'un produit',
    route: 'GET /products/{product_id}',
    run: () => {
      if (!productId) return Promise.resolve({ status: 0, ok: false, data: 'SKIP: pas de product_id' });
      return crmGet(`/products/${productId}`);
    },
  },
  {
    name: 'Lister les catégories',
    route: 'GET /categories',
    run: () => crmGet('/categories'),
  },
  {
    name: 'Rechercher dans les catégories',
    route: 'GET /categories?q=test',
    run: () => crmGet('/categories', { q: 'test' }),
  },

  // ──── Utilisateurs ────
  {
    name: 'Lister les utilisateurs',
    route: 'GET /users',
    run: () => crmGet('/users'),
    extractIds: (data) => {
      const arr = Array.isArray(data) ? data : (data as any)?.data;
      if (Array.isArray(arr) && arr.length > 0) {
        userId = String(arr[0].id ?? arr[0].user_id);
      }
    },
  },

  // ──── Rendez-vous ────
  {
    name: 'Rendez-vous d\'un client',
    route: 'GET /appointments/calendar/client/{client_id}',
    run: () => {
      if (!clientId) return Promise.resolve({ status: 0, ok: false, data: 'SKIP: pas de client_id' });
      return crmGet(`/appointments/calendar/client/${clientId}`);
    },
  },
  {
    name: 'Rendez-vous d\'un client (avec date)',
    route: 'GET /appointments/calendar/client/{client_id}?date=...',
    run: () => {
      if (!clientId) return Promise.resolve({ status: 0, ok: false, data: 'SKIP: pas de client_id' });
      const today = new Date().toISOString().slice(0, 10);
      return crmGet(`/appointments/calendar/client/${clientId}`, { date: today });
    },
  },
  {
    name: 'Disponibilités d\'un utilisateur',
    route: 'GET /appointments/availability/{user_id}',
    run: () => {
      if (!userId) return Promise.resolve({ status: 0, ok: false, data: 'SKIP: pas de user_id' });
      return crmGet(`/appointments/availability/${userId}`);
    },
  },
  {
    name: 'Disponibilités d\'un utilisateur (avec date)',
    route: 'GET /appointments/availability/{user_id}?date=...',
    run: () => {
      if (!userId) return Promise.resolve({ status: 0, ok: false, data: 'SKIP: pas de user_id' });
      const today = new Date().toISOString().slice(0, 10);
      return crmGet(`/appointments/availability/${userId}`, { date: today });
    },
  },

  // ──── Recherche globale ────
  {
    name: 'Recherche globale — clients',
    route: 'GET /search/clients?s=a',
    run: () => crmGet('/search/clients', { s: 'a' }),
  },
  {
    name: 'Recherche globale — commandes',
    route: 'GET /search/orders?s=a',
    run: () => crmGet('/search/orders', { s: 'a' }),
  },
  {
    name: 'Recherche globale — produits',
    route: 'GET /search/products?s=a',
    run: () => crmGet('/search/products', { s: 'a' }),
  },

  // ──── Endpoint middleware /api/chat ────
  {
    name: 'POST /api/chat — sans message (400)',
    route: 'POST /api/chat',
    run: async () => {
      const res = await fetch(`${APP_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userToken: USER_TOKEN }),
      });
      return { status: res.status, ok: res.status === 400, data: await res.json().catch(() => null) };
    },
  },
  {
    name: 'POST /api/chat — sans token (401)',
    route: 'POST /api/chat',
    run: async () => {
      const res = await fetch(`${APP_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Bonjour' }),
      });
      return { status: res.status, ok: res.status === 401, data: await res.json().catch(() => null) };
    },
  },
  {
    name: 'POST /api/chat — requête valide',
    route: 'POST /api/chat',
    run: async () => {
      const res = await fetch(`${APP_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Liste les statuts de commandes possibles',
          userToken: USER_TOKEN,
        }),
      });
      const data = await res.json().catch(() => null);
      return { status: res.status, ok: res.ok, data };
    },
  },
];

// ─── Exécution ────────────────────────────────────────────

async function runTests() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║       🧪 Tests API CRM Paperasse — Nadia AI               ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Base URL : ${BASE_URL.padEnd(47)}║`);
  console.log(`║  Token    : ${(USER_TOKEN!.slice(0, 8) + '...').padEnd(47)}║`);
  console.log(`║  Tests    : ${String(tests.length).padEnd(47)}║`);
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const results: TestResult[] = [];

  for (const test of tests) {
    const start = performance.now();
    let result: TestResult;

    try {
      const res = await test.run();
      const duration = Math.round(performance.now() - start);

      // Extraire des IDs pour les tests suivants
      if (test.extractIds && res.ok) {
        test.extractIds(res.data);
      }

      result = {
        name: test.name,
        route: test.route,
        status: res.status,
        ok: res.ok,
        duration,
        dataPreview: preview(res.data),
      };
    } catch (err) {
      const duration = Math.round(performance.now() - start);
      result = {
        name: test.name,
        route: test.route,
        status: null,
        ok: false,
        duration,
        error: (err as Error).message,
      };
    }

    const icon = result.ok ? '✅' : result.status === 0 ? '⏭️' : '❌';
    const statusStr = result.status ? `${result.status}` : 'ERR';
    console.log(`${icon} [${statusStr.padStart(3)}] ${result.name.padEnd(45)} ${String(result.duration).padStart(5)}ms`);
    console.log(`       ${result.route}`);
    if (result.error) console.log(`       ⚠️  ${result.error}`);
    if (result.dataPreview) console.log(`       📦 ${JSON.stringify(result.dataPreview)}`);
    console.log('');

    results.push(result);
  }

  // ─── Résumé ───
  const passed = results.filter((r) => r.ok).length;
  const skipped = results.filter((r) => r.status === 0).length;
  const failed = results.filter((r) => !r.ok && r.status !== 0).length;
  const totalDuration = results.reduce((s, r) => s + r.duration, 0);

  console.log('═'.repeat(64));
  console.log(`\n📊 Résumé: ${passed} passés, ${skipped} ignorés, ${failed} échoués — ${totalDuration}ms total\n`);

  if (failed > 0) {
    console.log('Routes en échec:');
    for (const r of results.filter((r) => !r.ok && r.status !== 0)) {
      console.log(`  ❌ ${r.route} — ${r.error || `HTTP ${r.status}`}`);
    }
    console.log('');
    process.exit(1);
  }
}

runTests();
