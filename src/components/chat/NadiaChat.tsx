'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage as ChatMessageType, MiddlewareResponse } from '@/types';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { QuickActions } from './QuickActions';
import { NadiaAvatar } from './NadiaAvatar';

export function NadiaChat() {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Charger l'historique depuis le localStorage au montage
  useEffect(() => {
    const saved = localStorage.getItem('nadia-chat-history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setMessages(parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        })));
      } catch (e) {
        console.error('Erreur lors du chargement de l\'historique', e);
      }
    }
  }, []);

  // Sauvegarder dans le localStorage à chaque changement de messages
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('nadia-chat-history', JSON.stringify(messages));
    } else {
      localStorage.removeItem('nadia-chat-history');
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    const userMsg: ChatMessageType = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000);

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const data: MiddlewareResponse = await res.json();

      setMessages(prev => [...prev, {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.texte,
        timestamp: new Date(),
        data: data.donnees ? { type: data.type_donnees ?? 'texte', donnees: data.donnees } : undefined,
      }]);
    } catch (err) {
      const message = (err as Error).name === 'AbortError'
        ? 'La requête a pris trop de temps. Essaie de reformuler ta question plus simplement.'
        : 'Une erreur réseau est survenue. Vérifie ta connexion et réessaie.';
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Désolée, ${message}`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const handleQuickAction = (label: string) => {
    const prompts: Record<string, string> = {
      "CA aujourd'hui": "Quel est le chiffre d'affaires d'aujourd'hui ?",
      'CA mois': "Quel est le chiffre d'affaires de ce mois ?",
      'Performance équipe': "Montre-moi la performance de l'équipe.",
      'Paiements': 'Affiche le résumé des paiements.',
      'Alertes': 'Y a-t-il des alertes ou commandes en retard ?',
      'Marketing': 'Montre-moi les statistiques marketing.',
    };
    sendMessage(prompts[label] || label);
  };

  return (
    <div className="flex flex-col h-full relative overflow-hidden"
      style={{ background: 'linear-gradient(145deg, #eef3fa 0%, #e4ecf7 50%, #dce5f4 100%)' }}
    >
      {/* Decorative background shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-200/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-20 w-80 h-80 bg-indigo-200/15 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-40 h-40 bg-cyan-200/10 rounded-full blur-2xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Top quick actions & clear history */}
        <div className="px-8 pt-6 pb-4 flex justify-between items-center">
          <QuickActions onSelect={handleQuickAction} variant="top" />
          {messages.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Voulez-vous vraiment effacer l\'historique de la conversation ?')) {
                  setMessages([]);
                  localStorage.removeItem('nadia-chat-history');
                }
              }}
              title="Vider l'historique"
              className="text-[13px] text-gray-500 hover:text-red-600 transition-colors ml-4 whitespace-nowrap bg-white/60 hover:bg-white/90 px-3.5 py-1.5 rounded-full border border-gray-200 shadow-sm"
            >
              <span className="flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
                Vider
              </span>
            </button>
          )}
        </div>

        {/* Chat zone */}
        <div className="flex-1 overflow-y-auto chat-scroll px-8">
          {messages.length === 0 ? (
            /* ===== WELCOME SCREEN ===== */
            <div className="flex items-center justify-center h-full">
              <div className="flex items-center gap-10">
                {/* Welcome bubble */}
                <div className="max-w-sm">
                  <div className="bg-white/90 backdrop-blur-sm rounded-3xl px-8 py-7 shadow-xl shadow-blue-900/5 border border-white/60">
                    <h2 className="text-[26px] font-bold text-[var(--nadia-blue-900)] mb-2 tracking-tight">
                      Bonjour !
                    </h2>
                    <p className="text-[15px] text-[#475569] leading-[1.8]">
                      Que puis-je{' '}
                      <span className="font-semibold text-[var(--nadia-blue-600)]">analyser</span>
                      {' '}ou{' '}
                      <span className="font-semibold text-[var(--nadia-blue-600)]">faire pour vous</span>
                      {' '}aujourd&apos;hui ?
                    </p>
                  </div>

                  <p className="text-[13px] text-[#94a3b8] mt-4 ml-2 tracking-wide">
                    En attente d&apos;une instruction...
                  </p>
                </div>

                {/* Nadia avatar */}
                <NadiaAvatar size="lg" />
              </div>
            </div>
          ) : (
            /* ===== MESSAGES ===== */
            <>
              {messages.map(msg => (
                <ChatMessage key={msg.id} message={msg} />
              ))}

              {isLoading && (
                <div className="flex items-start gap-3 mb-5 msg-enter">
                  <NadiaAvatar size="sm" />
                  <div className="bg-white/90 backdrop-blur-sm rounded-2xl rounded-bl-sm px-5 py-4 shadow-md shadow-gray-200/30 border border-white/60">
                    <div className="flex gap-2">
                      <span className="w-2.5 h-2.5 bg-[var(--nadia-blue-400)] rounded-full typing-dot"></span>
                      <span className="w-2.5 h-2.5 bg-[var(--nadia-blue-500)] rounded-full typing-dot"></span>
                      <span className="w-2.5 h-2.5 bg-[var(--nadia-blue-600)] rounded-full typing-dot"></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* ===== BOTTOM BAR ===== */}
        <div className="px-8 pb-6 pt-4 space-y-3">
          <ChatInput onSend={sendMessage} disabled={isLoading} />
          <div className="flex justify-center">
            <QuickActions onSelect={handleQuickAction} variant="bottom" />
          </div>
        </div>
      </div>
    </div>
  );
}
