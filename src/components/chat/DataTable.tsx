'use client';

import { useMemo, useState } from 'react';

type SortDir = 'asc' | 'desc' | null;

function compare(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  const an = typeof a === 'number' ? a : Number(a);
  const bn = typeof b === 'number' ? b : Number(b);
  if (!Number.isNaN(an) && !Number.isNaN(bn) && (typeof a === 'number' || /^-?\d/.test(String(a)))
                                              && (typeof b === 'number' || /^-?\d/.test(String(b)))) {
    return an - bn;
  }
  return String(a).localeCompare(String(b), 'fr', { numeric: true, sensitivity: 'base' });
}

export function DataTable({ data }: { data: Record<string, unknown>[] }) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [filter, setFilter] = useState('');

  const columns = useMemo(() => (data[0] ? Object.keys(data[0]) : []), [data]);

  const filtered = useMemo(() => {
    if (!filter.trim()) return data;
    const q = filter.toLowerCase();
    return data.filter((row) =>
      columns.some((c) => String(row[c] ?? '').toLowerCase().includes(q))
    );
  }, [data, filter, columns]);

  const sorted = useMemo(() => {
    if (!sortCol || !sortDir) return filtered;
    const arr = [...filtered];
    arr.sort((a, b) => {
      const r = compare(a[sortCol], b[sortCol]);
      return sortDir === 'asc' ? r : -r;
    });
    return arr;
  }, [filtered, sortCol, sortDir]);

  function toggleSort(col: string) {
    if (sortCol !== col) { setSortCol(col); setSortDir('asc'); return; }
    if (sortDir === 'asc') { setSortDir('desc'); return; }
    if (sortDir === 'desc') { setSortCol(null); setSortDir(null); return; }
    setSortDir('asc');
  }

  if (!data.length) return null;

  return (
    <div className="msg-enter space-y-2">
      <div className="flex items-center gap-3 px-1">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
               viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filtrer…"
            className="w-full pl-9 pr-3 py-2 text-[13px] bg-white border border-slate-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-300"
          />
        </div>
        <span className="text-[12px] text-slate-500">
          {filter || sortCol
            ? `${sorted.length} / ${data.length} ligne${data.length > 1 ? 's' : ''}`
            : `${data.length} ligne${data.length > 1 ? 's' : ''}`}
        </span>
        {(filter || sortCol) && (
          <button
            onClick={() => { setFilter(''); setSortCol(null); setSortDir(null); }}
            className="text-[12px] text-blue-600 hover:underline"
          >
            réinitialiser
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-md shadow-gray-200/30 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-[#eff6ff] to-[#f0f4ff]">
              {columns.map((col) => {
                const isActive = sortCol === col;
                return (
                  <th
                    key={col}
                    onClick={() => toggleSort(col)}
                    className="px-4 py-3 text-left text-[12px] font-semibold text-[#1e40af]
                               uppercase tracking-wider border-b border-blue-100/50 cursor-pointer
                               select-none hover:bg-blue-100/40 transition-colors"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {col.replace(/_/g, ' ')}
                      <SortIcon active={isActive} dir={isActive ? sortDir : null} />
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-6 text-center text-[13px] text-slate-400">
                  Aucune ligne ne correspond au filtre.
                </td>
              </tr>
            ) : (
              sorted.map((row, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-blue-50/30 transition-colors">
                  {columns.map((col) => (
                    <td key={col} className="px-4 py-2.5 text-[13px] text-gray-600">
                      {String(row[col] ?? '-')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  const base = 'w-3 h-3 transition-opacity';
  if (!active || !dir) {
    return (
      <svg className={`${base} opacity-30`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M7 15l5 5 5-5M7 9l5-5 5 5" />
      </svg>
    );
  }
  return dir === 'asc' ? (
    <svg className={`${base} opacity-90`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M7 14l5-5 5 5" />
    </svg>
  ) : (
    <svg className={`${base} opacity-90`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M7 10l5 5 5-5" />
    </svg>
  );
}
