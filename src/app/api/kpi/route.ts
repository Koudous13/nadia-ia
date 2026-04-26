import { NextRequest } from 'next/server';
import { executeToolCall } from '@/lib/crm/client';

export const maxDuration = 15;

type Kpi = { label: string; value: string; sub?: string; tone?: 'good' | 'warn' | 'neutral' };

function fmtEur(v: unknown): string {
  const n = typeof v === 'number' ? v : Number(v ?? 0);
  if (Number.isNaN(n)) return '–';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}
function fmtNum(v: unknown): string {
  const n = typeof v === 'number' ? v : Number(v ?? 0);
  if (Number.isNaN(n)) return '–';
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(n);
}
function todayIso() { return new Date().toISOString().slice(0, 10); }
function monthStart() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`; }
function prevMonthRange() {
  const d = new Date(); d.setMonth(d.getMonth() - 1);
  const y = d.getFullYear(); const m = d.getMonth() + 1;
  const last = new Date(y, m, 0).getDate();
  return { from: `${y}-${String(m).padStart(2,'0')}-01`, to: `${y}-${String(m).padStart(2,'0')}-${last}` };
}

async function buildKpis(page: string): Promise<Kpi[]> {
  switch (page) {
    case 'ca-aujourdhui': {
      const today = todayIso();
      const ca = await executeToolCall('get_ca', { date_from: today, date_to: today }) as { ca_encaisse?: number; nb_commandes_avec_paiement?: number };
      const top = await executeToolCall('get_top_vendors', { date_from: today, date_to: today, limit: '1' }) as Array<{ vendeur: string; ca_encaisse: number }>;
      const basket = await executeToolCall('get_average_basket', { date_from: today, date_to: today }) as { panier_moyen?: number; nb_commandes?: number };
      return [
        { label: "CA encaissé aujourd'hui", value: fmtEur(ca.ca_encaisse), sub: `${ca.nb_commandes_avec_paiement ?? 0} commande(s) payée(s)`, tone: 'good' },
        { label: 'Top vendeur du jour', value: top[0]?.vendeur ?? '–', sub: top[0] ? fmtEur(top[0].ca_encaisse) : 'Aucun encaissement', tone: 'neutral' },
        { label: 'Panier moyen', value: fmtEur(basket.panier_moyen), sub: `sur ${basket.nb_commandes ?? 0} commande(s)`, tone: 'neutral' },
      ];
    }

    case 'ca-mois': {
      const start = monthStart();
      const today = todayIso();
      const prev = prevMonthRange();
      const summary = await executeToolCall('get_ca_summary', { date_from: start, date_to: today }) as
        { ca_facture: number; ca_encaisse: number; restant_a_encaisser: number; nb_commandes_facturees: number };
      const cmp = await executeToolCall('compare_periods', {
        from_a: start, to_a: today, from_b: prev.from, to_b: prev.to,
      }) as { delta: number; delta_pct: number | null };
      return [
        { label: 'CA encaissé MTD', value: fmtEur(summary.ca_encaisse), sub: `${summary.nb_commandes_facturees} commandes facturées`, tone: 'good' },
        { label: 'CA facturé MTD', value: fmtEur(summary.ca_facture), sub: 'hors annulées', tone: 'neutral' },
        { label: 'Restant à encaisser', value: fmtEur(summary.restant_a_encaisser), sub: 'sur le mois', tone: 'warn' },
        { label: 'vs mois précédent', value: cmp.delta_pct != null ? `${cmp.delta_pct > 0 ? '+' : ''}${cmp.delta_pct}%` : '–',
          sub: `Δ ${fmtEur(cmp.delta)}`, tone: (cmp.delta_pct ?? 0) >= 0 ? 'good' : 'warn' },
      ];
    }

    case 'paiements': {
      const start = monthStart();
      const today = todayIso();
      const ca = await executeToolCall('get_ca', { date_from: start, date_to: today }) as { ca_encaisse?: number };
      const balance = await executeToolCall('get_outstanding_balance', {}) as { restant_a_encaisser: number };
      const stripe = await executeToolCall('get_ca_by_payment_type', { type: 'stripe', date_from: start, date_to: today }) as Array<{ total: number }>;
      const cash = await executeToolCall('get_ca_by_payment_type', { type: 'cash', date_from: start, date_to: today }) as Array<{ total: number }>;
      return [
        { label: 'Encaissé MTD', value: fmtEur(ca.ca_encaisse), tone: 'good' },
        { label: 'Restant à encaisser', value: fmtEur(balance.restant_a_encaisser), sub: 'global', tone: 'warn' },
        { label: 'Stripe MTD', value: fmtEur(stripe[0]?.total ?? 0), tone: 'neutral' },
        { label: 'Cash MTD', value: fmtEur(cash[0]?.total ?? 0), tone: 'neutral' },
      ];
    }

    case 'performance-equipe': {
      const start = monthStart();
      const today = todayIso();
      const top = await executeToolCall('get_top_vendors', { date_from: start, date_to: today, limit: '1' }) as Array<{ vendeur: string; ca_encaisse: number }>;
      const time = await executeToolCall('get_average_processing_time', {}) as { delai_moyen_jours: number; nb_terminees: number };
      const stats = await executeToolCall('get_orders_by_status', { date_from: start, date_to: today }) as Array<{ status: string; count: number }>;
      const total = stats.reduce((s, r) => s + Number(r.count), 0);
      const annul = Number(stats.find((r) => r.status === 'Annulée')?.count ?? 0);
      const term = Number(stats.find((r) => r.status === 'Terminée')?.count ?? 0);
      const tauxAnnul = total > 0 ? Math.round((annul / total) * 1000) / 10 : 0;
      return [
        { label: 'Top vendeur du mois', value: top[0]?.vendeur ?? '–', sub: top[0] ? fmtEur(top[0].ca_encaisse) : 'Aucun', tone: 'good' },
        { label: 'Délai moyen traitement', value: `${fmtNum(time.delai_moyen_jours)} j`, sub: `${time.nb_terminees} dossiers clôturés (global)`, tone: 'neutral' },
        { label: 'Terminées MTD', value: fmtNum(term), sub: `sur ${total} créées`, tone: 'good' },
        { label: "Taux d'annulation MTD", value: `${tauxAnnul}%`, sub: `${annul} annulée(s)`, tone: tauxAnnul > 10 ? 'warn' : 'neutral' },
      ];
    }

    case 'alertes': {
      const overdue = await executeToolCall('get_overdue_orders', { threshold_days: '30', group_by: 'user', limit: '50' }) as { total_count: number; ca_bloque_total: number };
      const blocked = await executeToolCall('get_orders_blocked', { group_by: 'user', limit: '50' }) as { total_count: number; ca_bloque_total: number };
      const orphans = await executeToolCall('get_payments_without_order', {}) as { total_count: number; montant_total: number };
      const unpaid  = await executeToolCall('get_unpaid_quotes', { min_amount: '500', limit: '200' }) as { total_count: number; ca_potentiel_total: number };
      return [
        { label: 'Commandes > 30j', value: fmtNum(overdue.total_count), sub: `${fmtEur(overdue.ca_bloque_total)} bloqués`, tone: 'warn' },
        { label: 'Dossiers bloqués', value: fmtNum(blocked.total_count), sub: `${fmtEur(blocked.ca_bloque_total)} en attente externe`, tone: 'warn' },
        { label: 'Paiements orphelins', value: fmtNum(orphans.total_count), sub: `${fmtEur(orphans.montant_total)} sans commande`, tone: orphans.total_count > 0 ? 'warn' : 'good' },
        { label: 'Devis ≥ 500 € non payés', value: fmtNum(unpaid.total_count), sub: fmtEur(unpaid.ca_potentiel_total) + ' potentiel', tone: 'warn' },
      ];
    }

    default:
      return [];
  }
}

export async function GET(request: NextRequest) {
  const page = request.nextUrl.searchParams.get('page') || '';
  if (!page) return Response.json({ error: 'param "page" requis' }, { status: 400 });
  try {
    const kpis = await buildKpis(page);
    return Response.json({ page, kpis }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=120' },
    });
  } catch (e) {
    console.error('[KPI Error]', e);
    return Response.json({ error: 'Erreur calcul KPI', details: (e as Error).message }, { status: 500 });
  }
}
