'use client';

import { useEffect, useState } from 'react';

type Kpi = { label: string; value: string; sub?: string; tone?: 'good' | 'warn' | 'neutral' };

const PAGE_KEY: Record<string, string> = {
  '/ca-aujourdhui': 'ca-aujourdhui',
  '/ca-mois': 'ca-mois',
  '/paiements': 'paiements',
  '/performance-equipe': 'performance-equipe',
  '/alertes': 'alertes',
};

export function PageKpis({ pathname }: { pathname: string }) {
  const pageKey = PAGE_KEY[pathname];
  const [kpis, setKpis] = useState<Kpi[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!pageKey) { setKpis(null); return; }
    let cancelled = false;
    setLoading(true);
    setErr(null);
    fetch(`/api/kpi?page=${pageKey}`)
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((d) => { if (!cancelled) setKpis(d.kpis); })
      .catch((e) => { if (!cancelled) setErr((e as Error).message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [pageKey]);

  if (!pageKey) return null;

  return (
    <div className="px-8 pt-3 pb-1">
      <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3">
        {loading && !kpis && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/80 p-4 animate-pulse">
            <div className="h-3 w-24 bg-slate-200 rounded mb-2" />
            <div className="h-6 w-32 bg-slate-200 rounded mb-1" />
            <div className="h-3 w-20 bg-slate-100 rounded" />
          </div>
        ))}
        {err && (
          <div className="col-span-full text-[12px] text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">
            KPI indisponibles : {err}
          </div>
        )}
        {kpis?.map((k, i) => <KpiCard key={i} kpi={k} />)}
      </div>
    </div>
  );
}

function KpiCard({ kpi }: { kpi: Kpi }) {
  const toneRing = kpi.tone === 'good' ? 'ring-emerald-200/60'
                  : kpi.tone === 'warn' ? 'ring-amber-200/60'
                  : 'ring-slate-200/60';
  const toneValue = kpi.tone === 'good' ? 'text-emerald-700'
                   : kpi.tone === 'warn' ? 'text-amber-700'
                   : 'text-slate-800';
  return (
    <div className={`bg-white/85 backdrop-blur-sm rounded-xl border border-white/80 px-4 py-3 ring-1 ${toneRing} shadow-sm`}>
      <div className="text-[11px] uppercase tracking-wider text-slate-500 font-medium truncate">{kpi.label}</div>
      <div className={`mt-1 text-[18px] font-semibold ${toneValue} truncate`} title={kpi.value}>{kpi.value}</div>
      {kpi.sub && <div className="text-[11px] text-slate-500 mt-0.5 truncate" title={kpi.sub}>{kpi.sub}</div>}
    </div>
  );
}
