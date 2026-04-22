'use client';

import { useState } from 'react';
import { routeForLabel } from '@/lib/nav-routes';

type IconProps = { className?: string };

const Icon = {
  Ressources: (p: IconProps) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 21V9" />
    </svg>
  ),
  Assistant: (p: IconProps) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  ),
  Chart: (p: IconProps) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M7 15l4-4 3 3 5-6" />
    </svg>
  ),
  Calendar: (p: IconProps) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  Team: (p: IconProps) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Payments: (p: IconProps) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M15 9.5a2 2 0 0 0-2-1.5h-2a2 2 0 1 0 0 4h2a2 2 0 1 1 0 4h-2a2 2 0 0 1-2-1.5M12 6v2m0 8v2" />
    </svg>
  ),
  Alert: (p: IconProps) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  ),
  Marketing: (p: IconProps) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12l3 3 5-6" />
    </svg>
  ),
  Sparkles: (p: IconProps) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
    </svg>
  ),
  Chevron: (p: IconProps) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  Logo: (p: IconProps) => (
    <svg {...p} viewBox="0 0 40 40" fill="none">
      <rect x="4" y="6" width="32" height="28" rx="4" stroke="currentColor" strokeWidth="2.5" />
      <path d="M12 14h16M12 20h10M12 26h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
};

const MAIN_ITEMS = [
  { id: 'ressources', label: 'Ressources', icon: Icon.Ressources },
  { id: 'assistant', label: 'Assistant IA', icon: Icon.Assistant },
  { id: 'ca-jour', label: "CA aujourd'hui", icon: Icon.Chart },
  { id: 'ca-mois', label: 'CA mois', icon: Icon.Calendar },
  { id: 'perf', label: 'Performance équipe', icon: Icon.Team },
  { id: 'paiements', label: 'Paiements', icon: Icon.Payments },
  { id: 'alertes', label: 'Alertes', icon: Icon.Alert },
  { id: 'marketing', label: 'Marketing', icon: Icon.Marketing },
] as const;

interface SidebarProps {
  activePath?: string;
  onNavigate: (label: string) => void;
}

export function Sidebar({ activePath = '/', onNavigate, isExpanded = true, onToggle }: SidebarProps & { isExpanded?: boolean; onToggle?: () => void }) {
  // Use the passed isExpanded value instead of internal state

  return (
    <aside className="w-full md:w-64 shrink-0 bg-[#1E3A5F] text-white flex flex-col h-screen">
      <div className="px-5 py-5">
        <button
          onClick={() => onNavigate('Assistant IA')}
          className="flex items-center gap-2.5 w-full text-left hover:opacity-90 transition-opacity"
        >
          <Icon.Logo className="w-8 h-8 text-white" />
          <div className="leading-tight">
            <div className="font-bold text-[19px] tracking-tight">Paperasse</div>
            <div className="text-[9px] text-white/50 tracking-[0.15em] uppercase">Assistance administrative</div>
          </div>
        </button>
      </div>

      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {MAIN_ITEMS.map((item) => {
          const IconCmp = item.icon;
          const isActive = activePath === routeForLabel(item.label);
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.label)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium transition-colors cursor-pointer ${
                isActive ? 'bg-white/10 text-white' : 'text-white/80 hover:bg-white/5 hover:text-white'
              }`}
            >
              <IconCmp className="w-[18px] h-[18px] shrink-0" />
    <span className="hidden sm:inline">{item.label}</span>
            </button>
          );
        })}

        <div className="pt-6 pb-2 px-3">
          <div className="text-[10px] text-white/40 tracking-[0.2em] uppercase font-semibold">Utilitaires</div>
        </div>

      </nav>

      <div className="p-4">
        <button
          onClick={() => onNavigate('Actions recommandées')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
        >
          <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
            <Icon.Sparkles className="w-4 h-4" />
          </div>
          <span className="text-[13px] font-medium text-white/90">Actions recommandées</span>
        </button>
      </div>
    </aside>
  );
}
