'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage as ChatMessageType, MiddlewareResponse, CustomPrompt } from '@/types';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { QuickActions } from './QuickActions';
import { NadiaAvatar } from './NadiaAvatar';
import { PromptsManager } from './PromptsManager';

export function NadiaChat() {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [customPrompts, setCustomPrompts] = useState<CustomPrompt[]>([]);
  const [isPromptsManagerOpen, setIsPromptsManagerOpen] = useState(false);
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

  // Charger les prompts personnalisés au montage
  useEffect(() => {
    const saved = localStorage.getItem('nadia-custom-prompts');
    if (saved) {
      try {
        setCustomPrompts(JSON.parse(saved));
      } catch (e) {
        console.error('Erreur lors du chargement des prompts', e);
      }
    }
  }, []);

  // Sauvegarder les prompts dans le localStorage
  useEffect(() => {
    localStorage.setItem('nadia-custom-prompts', JSON.stringify(customPrompts));
  }, [customPrompts]);

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

  const handleSavePrompt = (newPrompt: Omit<CustomPrompt, 'id' | 'createdAt'>) => {
    const prompt: CustomPrompt = {
      ...newPrompt,
      id: `prompt-${Date.now()}`,
      createdAt: Date.now(),
    };
    setCustomPrompts(prev => [prompt, ...prev]);
  };

  const handleUpdatePrompt = (id: string, updatedPrompt: Partial<CustomPrompt>) => {
    setCustomPrompts(prev => prev.map(p => p.id === id ? { ...p, ...updatedPrompt } : p));
  };

  const handleDeletePrompt = (id: string) => {
    setCustomPrompts(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="flex flex-col h-full relative overflow-hidden bg-slate-50 font-sans">
      {/* Dynamic Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="bg-blob blob-animate w-[600px] h-[600px] -top-[200px] -right-[100px] bg-blue-200" />
        <div className="bg-blob blob-animate w-[500px] h-[500px] -bottom-[100px] -left-[100px] bg-indigo-100" style={{ animationDelay: '-5s' }} />
        <div className="bg-blob blob-animate w-[300px] h-[300px] top-1/3 left-1/4 bg-cyan-100" style={{ animationDelay: '-12s' }} />
      </div>

      {/* Content wrapper */}
      <div className="relative z-10 flex flex-col h-full max-w-6xl mx-auto w-full">
        {/* Top header area */}
        <div className="px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <span className="text-white font-bold text-sm">N</span>
              </div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Nadia<span className="text-blue-600">.ai</span></h1>
            </div>
            <div className="h-4 w-[1px] bg-slate-200 mx-1" />
            <button
              onClick={() => setIsPromptsManagerOpen(true)}
              className="group flex items-center gap-2 px-4 py-2 bg-white/60 hover:bg-white backdrop-blur-md border border-slate-200/60 rounded-full text-[13px] font-semibold text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm active:scale-95"
            >
              <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path></svg>
              Mes Prompts
            </button>
          </div>
          
          {messages.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Effacer l\'historique ?')) {
                  setMessages([]);
                  localStorage.removeItem('nadia-chat-history');
                }
              }}
              className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
              title="Vider l'historique"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
            </button>
          )}
        </div>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto chat-scroll px-6 space-y-6 pb-4 pt-2">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full animate-fade">
              <div className="mb-8">
                <NadiaAvatar size="lg" />
              </div>
              <div className="text-center space-y-3 max-w-sm">
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Ravi de vous voir !</h2>
                <p className="text-slate-500 leading-relaxed text-[15px]">
                  Je suis Nadia, votre assistante CRM Paperasse. Que souhaitez-vous analyser ou consulter aujourd&apos;hui ?
                </p>
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
          {/* Custom prompt buttons */}
          {customPrompts.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
              {customPrompts.slice(0, 5).map(prompt => (
                <button
                  key={prompt.id}
                  onClick={() => sendMessage(prompt.content)}
                  className="px-4 py-2 bg-blue-50/50 border border-blue-100 rounded-xl text-[12px] font-medium text-blue-700 hover:bg-blue-100/50 hover:border-blue-200 transition-all whitespace-nowrap shadow-sm"
                >
                  {prompt.title}
                </button>
              ))}
              {customPrompts.length > 5 && (
                <button
                  onClick={() => setIsPromptsManagerOpen(true)}
                  className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[12px] font-medium text-gray-500 hover:bg-gray-100 transition-all whitespace-nowrap"
                >
                  Voir plus...
                </button>
              )}
            </div>
          )}
          
          <ChatInput onSend={sendMessage} disabled={isLoading} />
          <div className="flex justify-center">
            <QuickActions onSelect={handleQuickAction} variant="bottom" />
          </div>
        </div>
      </div>

      {/* Prompts Manager Modal */}
      {isPromptsManagerOpen && (
        <PromptsManager
          prompts={customPrompts}
          onSave={handleSavePrompt}
          onUpdate={handleUpdatePrompt}
          onDelete={handleDeletePrompt}
          onClose={() => setIsPromptsManagerOpen(false)}
        />
      )}
    </div>
  );
}
