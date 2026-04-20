'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { ChatMessage as ChatMessageType, MiddlewareResponse, CustomPrompt } from '@/types';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { QuickActions } from './QuickActions';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { PromptsManager } from './PromptsManager';

export function NadiaChat() {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [customPrompts, setCustomPrompts] = useState<CustomPrompt[]>([]);
  const [isPromptsManagerOpen, setIsPromptsManagerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string | undefined>("CA aujourd'hui");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('nadia-chat-history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setMessages(parsed.map((m: ChatMessageType) => ({ ...m, timestamp: new Date(m.timestamp) })));
      } catch {}
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('nadia-custom-prompts');
    if (saved) {
      try {
        setCustomPrompts(JSON.parse(saved));
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('nadia-custom-prompts', JSON.stringify(customPrompts));
  }, [customPrompts]);

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

  const sendMessage = useCallback(
    async (text: string) => {
      const userMsg: ChatMessageType = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      try {
        const history = messages.map((m) => ({ role: m.role, content: m.content }));
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

        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: data.texte,
            timestamp: new Date(),
            data: data.donnees ? { type: data.type_donnees ?? 'texte', donnees: data.donnees } : undefined,
          },
        ]);
      } catch (err) {
        const message =
          (err as Error).name === 'AbortError'
            ? 'La requête a pris trop de temps. Essaie de reformuler ta question plus simplement.'
            : 'Une erreur réseau est survenue. Vérifie ta connexion et réessaie.';
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: `Désolée, ${message}`,
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages],
  );

  const handleQuickAction = (label: string) => {
    setActiveTab(label);
    const prompts: Record<string, string> = {
      "CA aujourd'hui": "Quel est le chiffre d'affaires d'aujourd'hui ?",
      'CA mois': "Quel est le chiffre d'affaires de ce mois ?",
      'Performance équipe': "Montre-moi la performance de l'équipe.",
      Paiements: 'Affiche le résumé des paiements.',
      Alertes: 'Y a-t-il des alertes ou commandes en retard ?',
      Marketing: 'Montre-moi les statistiques marketing.',
    };
    sendMessage(prompts[label] || label);
  };

  const handleSavePrompt = (newPrompt: Omit<CustomPrompt, 'id' | 'createdAt'>) => {
    setCustomPrompts((prev) => [{ ...newPrompt, id: `prompt-${Date.now()}`, createdAt: Date.now() }, ...prev]);
  };
  const handleUpdatePrompt = (id: string, updated: Partial<CustomPrompt>) =>
    setCustomPrompts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)));
  const handleDeletePrompt = (id: string) => setCustomPrompts((prev) => prev.filter((p) => p.id !== id));

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/30 font-sans overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopHeader userName="Ali" notificationCount={3} />

        <QuickActions onSelect={handleQuickAction} variant="tabs" activeLabel={activeTab} />

        {/* Main scrollable area */}
        <div className="flex-1 overflow-y-auto chat-scroll px-8">
          {messages.length === 0 ? (
            <WelcomeHero />
          ) : (
            <div className="max-w-4xl mx-auto py-6 space-y-4">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              {isLoading && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Bottom area: input + pills */}
        <div className="px-8 pb-6 pt-3 space-y-3">
          {customPrompts.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar max-w-4xl mx-auto w-full">
              {customPrompts.slice(0, 5).map((prompt) => (
                <button
                  key={prompt.id}
                  onClick={() => sendMessage(prompt.content)}
                  className="px-4 py-2 bg-blue-50 border border-blue-100 rounded-xl text-[12px] font-medium text-blue-700 hover:bg-blue-100 transition-all whitespace-nowrap"
                >
                  {prompt.title}
                </button>
              ))}
              <button
                onClick={() => setIsPromptsManagerOpen(true)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[12px] font-medium text-slate-500 hover:bg-slate-50 transition-all whitespace-nowrap"
              >
                + Gérer
              </button>
            </div>
          )}

          <div className="max-w-4xl mx-auto w-full">
            <ChatInput onSend={sendMessage} disabled={isLoading} />
          </div>

          <div className="max-w-4xl mx-auto w-full">
            <QuickActions onSelect={handleQuickAction} variant="pills" />
          </div>
        </div>
      </div>

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

function WelcomeHero() {
  return (
    <div className="max-w-5xl mx-auto h-full flex items-center justify-center py-8">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-6 items-center w-full">
        {/* Greeting card */}
        <div className="space-y-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl px-7 py-6 shadow-sm border border-white/80">
            <p className="text-[22px] font-semibold text-slate-800 leading-snug">
              Bonjour !<br />
              Que puis-je analyser ou faire pour vous aujourd&apos;hui ?
            </p>
          </div>
          <p className="text-[14px] text-slate-500 italic px-2">En attente d&apos;une instruction...</p>
        </div>

        {/* Illustration */}
        <div className="relative w-full aspect-[4/3] max-w-[520px] mx-auto">
          <Image
            src="/nadia-illustration.jpg"
            alt="Nadia"
            fill
            priority
            className="object-contain"
          />
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow">
        N
      </div>
      <div className="bg-white rounded-2xl rounded-bl-sm px-5 py-4 shadow-sm border border-slate-100">
        <div className="flex gap-1.5">
          <span className="w-2 h-2 bg-blue-400 rounded-full typing-dot" />
          <span className="w-2 h-2 bg-blue-500 rounded-full typing-dot" />
          <span className="w-2 h-2 bg-blue-600 rounded-full typing-dot" />
        </div>
      </div>
    </div>
  );
}
