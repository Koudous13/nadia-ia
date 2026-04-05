'use client';

const ACTIONS = [
  { label: "CA aujourd'hui", icon: '📊', color: 'from-blue-500 to-blue-600' },
  { label: 'CA mois', icon: '📈', color: 'from-indigo-500 to-indigo-600' },
  { label: 'Performance équipe', icon: '👥', color: 'from-violet-500 to-violet-600' },
  { label: 'Paiements', icon: '💳', color: 'from-cyan-500 to-cyan-600' },
  { label: 'Alertes', icon: '🔔', color: 'from-amber-500 to-amber-600' },
  { label: 'Marketing', icon: '📣', color: 'from-pink-500 to-pink-600' },
];

interface QuickActionsProps {
  onSelect: (label: string) => void;
  variant?: 'top' | 'bottom';
}

export function QuickActions({ onSelect, variant = 'bottom' }: QuickActionsProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {ACTIONS.map((a, i) => (
        <button
          key={a.label}
          onClick={() => onSelect(a.label)}
          style={{ animationDelay: `${i * 50}ms` }}
          className={`
            group relative inline-flex items-center gap-2 rounded-full text-[13px] font-medium
            transition-all duration-200 cursor-pointer
            ${variant === 'top'
              ? `px-4 py-2.5 bg-white/70 backdrop-blur-sm text-[#334155] border border-white/80
                 hover:bg-white hover:shadow-lg hover:shadow-blue-500/8 hover:border-blue-200 hover:-translate-y-0.5
                 active:translate-y-0 active:shadow-md`
              : `px-3.5 py-2 bg-white/50 backdrop-blur-sm text-[#475569] border border-gray-200/60
                 hover:bg-white hover:shadow-md hover:border-blue-200 hover:text-[#1e40af]
                 active:scale-[0.97]`
            }
          `}
        >
          <span className={`text-sm transition-transform duration-200 group-hover:scale-110`}>
            {a.icon}
          </span>
          {a.label}
        </button>
      ))}
    </div>
  );
}
