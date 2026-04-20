'use client';

interface TopHeaderProps {
  userName?: string;
  notificationCount?: number;
  onBack?: () => void;
  onClearConversation?: () => void;
}

export function TopHeader({ userName = 'Ali', notificationCount = 3, onBack, onClearConversation }: TopHeaderProps) {
  return (
    <div className="flex items-center justify-between px-8 pt-6 pb-4">
      {/* Title */}
      <div className="flex items-start gap-3">
        <button
          onClick={onBack}
          className="mt-1 text-slate-700 hover:text-slate-900 transition-colors"
          aria-label="Retour"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 leading-tight">Assistant IA – Nadia</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">Donnez vos instructions, j&apos;analyse et j&apos;exécute</p>
        </div>
      </div>

      {/* Right-side controls */}
      <div className="flex items-center gap-3">
        {/* Online toggle */}
        <div className="flex items-center gap-2 bg-emerald-500 text-white rounded-full pl-1.5 pr-4 py-1 shadow-sm shadow-emerald-500/20">
          <span className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm">
            <span className="w-2 h-2 bg-emerald-500 rounded-full" />
          </span>
          <span className="text-[13px] font-semibold">En ligne</span>
        </div>

        {/* Clear conversation */}
        {onClearConversation && (
          <button
            onClick={onClearConversation}
            title="Vider la conversation"
            aria-label="Vider la conversation"
            className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-full text-slate-500 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors"
          >
            <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <path d="M10 11v6M14 11v6" />
            </svg>
          </button>
        )}

        {/* User name pill */}
        <button className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-full hover:border-slate-300 transition-colors">
          <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M7 4v-2M17 4v-2M3 10h18" />
          </svg>
          <span className="text-[13px] font-medium text-slate-700">{userName}</span>
        </button>

        {/* Notifications */}
        <button className="relative w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-full hover:border-slate-300 transition-colors">
          <svg className="w-[18px] h-[18px] text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {notificationCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full ring-2 ring-white">
              {notificationCount}
            </span>
          )}
        </button>

        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-100 to-orange-200 ring-2 ring-white shadow-sm overflow-hidden flex items-center justify-center">
          <span className="text-sm font-bold text-orange-700">{userName.charAt(0).toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
}
