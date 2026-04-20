'use client';

const ACTIONS = [
  { label: "CA aujourd'hui", icon: 'chart' },
  { label: 'CA mois', icon: 'calendar' },
  { label: 'Performance équipe', icon: 'team' },
  { label: 'Paiements', icon: 'payments' },
  { label: 'Alertes', icon: 'alert' },
  { label: 'Marketing', icon: 'marketing' },
] as const;

function ActionIcon({ name, className }: { name: string; className: string }) {
  const common = { className, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (name) {
    case 'chart':
      return <svg {...common}><path d="M3 3v18h18" /><path d="M7 15l4-4 3 3 5-6" /></svg>;
    case 'calendar':
      return <svg {...common}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>;
    case 'team':
      return <svg {...common}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
    case 'payments':
      return <svg {...common}><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M2 10h20M6 14h4" /></svg>;
    case 'alert':
      return <svg {...common}><path d="M12 2l10 18H2L12 2z" /><path d="M12 9v4M12 17h.01" /></svg>;
    case 'marketing':
      return <svg {...common}><path d="M3 11v2a2 2 0 0 0 2 2h2l4 4V5l-4 4H5a2 2 0 0 0-2 2z" /><path d="M15 8a5 5 0 0 1 0 8" /></svg>;
    default:
      return null;
  }
}

interface QuickActionsProps {
  onSelect: (label: string) => void;
  variant?: 'tabs' | 'pills';
  activeLabel?: string;
}

export function QuickActions({ onSelect, variant = 'pills', activeLabel }: QuickActionsProps) {
  if (variant === 'tabs') {
    return (
      <div className="flex items-center gap-1 px-8 pb-2">
        {ACTIONS.map((a) => {
          const isActive = activeLabel === a.label;
          return (
            <button
              key={a.label}
              onClick={() => onSelect(a.label)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
              }`}
            >
              <ActionIcon name={a.icon} className="w-4 h-4" />
              <span>{a.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap justify-center">
      {ACTIONS.map((a) => (
        <button
          key={a.label}
          onClick={() => onSelect(a.label)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full text-[13px] font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 transition-all shadow-sm"
        >
          <ActionIcon name={a.icon} className={`w-4 h-4 ${a.icon === 'alert' ? 'text-amber-500' : 'text-slate-500'}`} />
          <span>{a.label}</span>
        </button>
      ))}
    </div>
  );
}
