'use client';

import { useEffect, useRef, useState } from 'react';

interface TopHeaderProps {
  userName?: string;
  notificationCount?: number;
  onBack?: () => void;
  onClearConversation?: () => void;
  onMenuClick?: () => void;
}

export function TopHeader({ userName = 'Ali', notificationCount = 3, onBack, onClearConversation, onMenuClick }: TopHeaderProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    }
    if (moreOpen) document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [moreOpen]);

  return (
    <div className="flex items-center justify-between gap-3 px-4 sm:px-8 pt-4 sm:pt-6 pb-3 sm:pb-4">
      {/* Burger mobile + titre */}
      <div className="flex items-start gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="md:hidden mt-1 w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600 shrink-0"
          aria-label="Ouvrir le menu"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {onBack && (
          <button
            onClick={onBack}
            className="hidden sm:block mt-1 text-slate-700 hover:text-slate-900 transition-colors"
            aria-label="Retour"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}

        <div className="min-w-0">
          <h1 className="text-[17px] sm:text-[22px] font-bold text-slate-900 leading-tight truncate">Assistant IA – Nadia</h1>
          <p className="hidden sm:block text-[13px] text-slate-500 mt-0.5">Donnez vos instructions, j&apos;analyse et j&apos;exécute</p>
        </div>
      </div>

      {/* Contrôles : compacts sur mobile, complets sur desktop */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Online toggle — caché sur très petit écran */}
        <div className="hidden sm:flex items-center gap-2 bg-emerald-500 text-white rounded-full pl-1.5 pr-4 py-1 shadow-sm shadow-emerald-500/20">
          <span className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm">
            <span className="w-2 h-2 bg-emerald-500 rounded-full" />
          </span>
          <span className="text-[13px] font-semibold">En ligne</span>
        </div>

        {/* Avatar — toujours visible */}
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-amber-100 to-orange-200 ring-2 ring-white shadow-sm overflow-hidden flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-orange-700">{userName.charAt(0).toUpperCase()}</span>
        </div>

        {/* Bloc desktop : 3 boutons séparés */}
        <div className="hidden sm:flex items-center gap-3">
          {onClearConversation && (
            <button
              onClick={onClearConversation}
              title="Vider la conversation"
              aria-label="Vider la conversation"
              className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-full text-slate-500 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors"
            >
              <TrashIcon />
            </button>
          )}

          <button className="relative w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-full hover:border-slate-300 transition-colors" aria-label="Notifications">
            <BellIcon />
            {notificationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full ring-2 ring-white">
                {notificationCount}
              </span>
            )}
          </button>

          <form action="/auth/signout" method="post">
            <button
              type="submit"
              title="Se déconnecter"
              aria-label="Se déconnecter"
              className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-full text-slate-500 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors"
            >
              <LogoutIcon />
            </button>
          </form>
        </div>

        {/* Bloc mobile : un seul bouton kebab qui ouvre un menu */}
        <div className="sm:hidden relative" ref={moreRef}>
          <button
            onClick={() => setMoreOpen((v) => !v)}
            className="relative w-9 h-9 flex items-center justify-center bg-white border border-slate-200 rounded-full text-slate-600"
            aria-label="Plus d'options"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
            </svg>
            {notificationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white" />
            )}
          </button>

          {moreOpen && (
            <div className="absolute right-0 top-11 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-30">
              <button className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-[14px] text-slate-700 hover:bg-slate-50">
                <BellIcon className="w-4 h-4 text-slate-500" />
                Notifications
                {notificationCount > 0 && (
                  <span className="ml-auto min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full">
                    {notificationCount}
                  </span>
                )}
              </button>
              {onClearConversation && (
                <button
                  onClick={() => { setMoreOpen(false); onClearConversation(); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-[14px] text-slate-700 hover:bg-slate-50"
                >
                  <TrashIcon className="w-4 h-4 text-slate-500" /> Vider la conversation
                </button>
              )}
              <div className="border-t border-slate-100 my-1" />
              <form action="/auth/signout" method="post">
                <button type="submit" className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-[14px] text-rose-600 hover:bg-rose-50">
                  <LogoutIcon className="w-4 h-4" /> Se déconnecter
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TrashIcon({ className = 'w-[18px] h-[18px]' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M10 11v6M14 11v6" />
    </svg>
  );
}

function BellIcon({ className = 'w-[18px] h-[18px] text-slate-600' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function LogoutIcon({ className = 'w-[18px] h-[18px]' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
