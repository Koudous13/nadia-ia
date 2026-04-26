// Smoke test des nouveaux outils ajoutés pour l'entraînement Nadia
import { readFileSync } from 'fs';
import path from 'path';

const envFile = readFileSync(path.resolve('.env.local'), 'utf-8');
for (const line of envFile.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

async function main() {
  const { executeToolCall } = await import('../src/lib/crm/client');

  const tests: Array<[string, Record<string, unknown>]> = [
    ['get_ca_summary', { date_from: '2026-04-01', date_to: '2026-04-30' }],
    ['get_ca_by_day', { date_from: '2026-04-01', date_to: '2026-04-15' }],
    ['get_ca_by_payment_type', { date_from: '2026-04-01', date_to: '2026-04-30' }],
    ['get_ca_by_payment_type', { type: 'stripe' }],
    ['get_ca_by_prestation', { date_from: '2026-04-01', date_to: '2026-04-30', limit: '5' }],
    ['get_average_basket', { date_from: '2026-04-01', date_to: '2026-04-30' }],
    ['get_average_payment', { date_from: '2026-04-01', date_to: '2026-04-30' }],
    ['get_outstanding_balance', {}],
    ['get_partial_payments', { limit: '3' }],
    ['get_clients_with_balance', { limit: '5' }],
    ['compare_periods', { from_a: '2026-04-01', to_a: '2026-04-25', from_b: '2026-03-01', to_b: '2026-03-25' }],
    ['get_overdue_orders', { threshold_days: '60', group_by: 'user', limit: '5' }],
    ['get_overdue_orders', { threshold_days: '60', limit: '5' }],
    ['get_orders_blocked', { group_by: 'user', limit: '5' }],
    ['get_processing_time_by_user', { limit: '5' }],
    ['get_average_processing_time', {}],
    ['get_orders_paid_not_treated', {}],
    ['get_orders_completed_not_paid', {}],
    ['get_inconsistent_amounts', {}],
    ['get_orders_without_user', {}],
    ['get_orders_without_prestation', {}],
    ['get_payments_without_order', {}],
    ['get_orders_without_payment', { exclude_quotes: 'true' }],
    ['get_duplicate_clients', { by: 'email' }],
    ['get_duplicate_payments', {}],
    ['get_unpaid_quotes', { min_amount: '500', limit: '5' }],
    ['get_top_clients', { limit: '5' }],
    ['get_clients_with_multiple_orders', { min: '3', limit: '5' }],
    ['get_inactive_clients', { months: '12', limit: '5' }],
    ['get_top_users_by_clients', { limit: '5' }],
    ['get_unconverted_quotes_by_user', { limit: '5' }],
    ['get_orders_needing_docs_by_user', {}],
    ['get_volume_vs_delay_by_user', {}],
    ['get_volume_vs_cancellations_by_user', {}],
    ['get_conversion_rate_by_user', { date_from: '2026-01-01' }],
    ['get_top_vendors_by_prestation', { prestation_keyword: 'titre' }],
    ['get_top_vendors_by_factured', { limit: '5' }],
    ['get_top_users_by_payment_type', { type: 'stripe', limit: '5' }],
    ['compare_users_periods', { from_a: '2026-04-01', to_a: '2026-04-25', from_b: '2026-03-01', to_b: '2026-03-25' }],
    ['get_user_daily_average', { date_from: '2026-04-01' }],
    ['get_orders_by_prestation', { date_from: '2026-04-01', limit: '5' }],
    ['get_ca_by_category', { limit: '5' }],
    ['get_ca_factured', { date_from: '2026-04-01', date_to: '2026-04-30', exclude_cancelled: 'true' }],
    ['get_orders_closed_on_date', { date: '2026-04-15' }],
    ['get_scheduled_reminders', {}],
    ['get_monthly_summary', { year: '2026', month: '4' }],
    ['get_loss_analysis', {}],
    ['get_time_loss_analysis', {}],
  ];

  let pass = 0, fail = 0;
  const failures: Array<[string, string]> = [];

  for (const [tool, args] of tests) {
    process.stdout.write(`▸ ${tool.padEnd(40)} ${JSON.stringify(args).slice(0,40).padEnd(40)} `);
    try {
      const r = await executeToolCall(tool, args);
      const isArray = Array.isArray(r);
      const len = isArray ? (r as unknown[]).length : (r ? Object.keys(r).length : 0);
      console.log(isArray ? `[${len} rows]` : `{${len} keys}`);
      pass++;
    } catch (e) {
      const msg = (e as Error).message;
      console.log(`FAIL: ${msg.slice(0,200)}`);
      failures.push([tool, msg]);
      fail++;
    }
  }

  console.log(`\n=== ${pass} pass / ${fail} fail ===`);
  if (failures.length) {
    console.log('\nFailures:');
    failures.forEach(([t, m]) => console.log(`  ${t}: ${m.slice(0,300)}`));
  }
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
