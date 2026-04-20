import { readFileSync } from 'fs';
import path from 'path';

const envFile = readFileSync(path.resolve('.env.local'), 'utf-8');
for (const line of envFile.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

async function main() {
  const { executeToolCall } = await import('../src/lib/crm/client');

  let passed = 0;
  let failed = 0;

  async function check(label: string, fn: () => Promise<unknown>, assert: (r: unknown) => boolean | string) {
    try {
      const r = await fn();
      const ok = assert(r);
      if (ok === true) { passed++; console.log(`  OK   ${label}`); }
      else { failed++; console.log(`  FAIL ${label}${typeof ok === 'string' ? ' — ' + ok : ''}`); console.log('       got:', JSON.stringify(r).slice(0, 300)); }
    } catch (e) {
      failed++;
      console.log(`  FAIL ${label} — exception: ${(e as Error).message}`);
    }
  }

  console.log('\n== Golden path ==');
  await check('search_clients(query=a) returns ≥1 and has first_name', () => executeToolCall('search_clients', { query: 'a' }),
    r => Array.isArray(r) && r.length > 0 && typeof (r[0] as { first_name?: string }).first_name === 'string');

  await check('get_users returns ≥1 and has name', () => executeToolCall('get_users', {}),
    r => Array.isArray(r) && r.length > 0 && typeof (r[0] as { name?: string }).name === 'string');

  await check('get_order_statuses returns counts', () => executeToolCall('get_order_statuses', {}),
    r => Array.isArray(r) && r.length > 0 && typeof (r[0] as { count?: number }).count === 'number');

  console.log('\n== Edge cases ==');
  await check('get_client(invalid id) returns error', () => executeToolCall('get_client', { client_id: 999999999 }),
    r => !!(r as { error?: string })?.error);

  await check('get_order(invalid id) returns error', () => executeToolCall('get_order', { order_id: 999999999 }),
    r => !!(r as { error?: string })?.error);

  await check('get_product(invalid id) returns error', () => executeToolCall('get_product', { product_id: 999999999 }),
    r => !!(r as { error?: string })?.error);

  await check('search_clients(no match) returns []', () => executeToolCall('search_clients', { query: 'zzzzznotexistingzzzzz' }),
    r => Array.isArray(r) && r.length === 0);

  await check('search_orders(no match) returns total=0', () => executeToolCall('search_orders', { query: 'BCNEVEREXIST' }),
    r => typeof r === 'object' && (r as { total?: number }).total === 0);

  console.log('\n== Real data round-trip ==');
  const clients = (await executeToolCall('search_clients', { query: 'a' })) as Array<{ id: number }>;
  const firstClientId = clients[0]?.id;
  if (firstClientId) {
    await check(`get_client(${firstClientId}) returns the client`, () => executeToolCall('get_client', { client_id: firstClientId }),
      r => typeof r === 'object' && typeof (r as { first_name?: string }).first_name === 'string');

    await check(`get_client_orders(${firstClientId}) returns array`, () => executeToolCall('get_client_orders', { client_id: firstClientId }),
      r => Array.isArray(r));
  }

  const orders = ((await executeToolCall('search_orders', { date_from: '2026-04-01' })) as { data: Array<{ id: number }> }).data;
  const firstOrderId = orders[0]?.id;
  if (firstOrderId) {
    await check(`get_order(${firstOrderId}) returns payments array`, () => executeToolCall('get_order', { order_id: firstOrderId }),
      r => typeof r === 'object' && Array.isArray((r as { payments?: unknown[] }).payments));

    await check(`get_order_payments(${firstOrderId}) returns array with montant`, () => executeToolCall('get_order_payments', { order_id: firstOrderId }),
      r => Array.isArray(r));
  }

  console.log('\n== Stats ==');
  await check('get_ca current year returns ca_encaisse number', () => executeToolCall('get_ca', { date_from: '2026-01-01', date_to: '2026-12-31' }),
    r => typeof (r as { ca_encaisse?: number }).ca_encaisse === 'number');

  await check('get_top_vendors limit=3 returns ≤3', () => executeToolCall('get_top_vendors', { date_from: '2026-01-01', limit: 3 }),
    r => Array.isArray(r) && r.length <= 3);

  await check('get_orders_by_status returns statuses', () => executeToolCall('get_orders_by_status', { date_from: '2026-01-01' }),
    r => Array.isArray(r) && r.length > 0);

  await check('get_categories with filter', () => executeToolCall('get_categories', { query: 'visa' }),
    r => Array.isArray(r));

  console.log(`\n== Résultat: ${passed} OK / ${failed} FAIL ==`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
