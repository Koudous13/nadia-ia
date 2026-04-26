'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ChatMessage, CustomPrompt, MiddlewareResponse } from '@/types';

interface ChatContextValue {
  messages: ChatMessage[];
  isLoading: boolean;
  customPrompts: CustomPrompt[];
  sendMessage: (text: string) => Promise<void>;
  clearMessages: () => void;
  savePrompt: (p: Omit<CustomPrompt, 'id' | 'createdAt'>) => void;
  updatePrompt: (id: string, patch: Partial<CustomPrompt>) => void;
  deletePrompt: (id: string) => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}

function storageKeyFor(pathname: string) {
  return `nadia-chat-history:${pathname || '/'}`;
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';
  const storageKey = storageKeyFor(pathname);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [customPrompts, setCustomPrompts] = useState<CustomPrompt[]>([]);
  const messagesRef = useRef<ChatMessage[]>([]);
  const activeKeyRef = useRef<string>(storageKey);

  // Load custom prompts once
  useEffect(() => {
    const savedP = localStorage.getItem('nadia-custom-prompts');
    if (savedP) {
      try { setCustomPrompts(JSON.parse(savedP)); } catch {}
    }
  }, []);

  // Load messages whenever pathname (and thus storageKey) changes
  useEffect(() => {
    activeKeyRef.current = storageKey;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as ChatMessage[];
        const restored = parsed.map((m) => ({ ...m, timestamp: new Date(m.timestamp) }));
        setMessages(restored);
        messagesRef.current = restored;
        return;
      } catch {}
    }
    setMessages([]);
    messagesRef.current = [];
  }, [storageKey]);

  // Persist messages — only under the currently active key (avoid races mid-navigation)
  useEffect(() => {
    messagesRef.current = messages;
    if (activeKeyRef.current !== storageKey) return;
    if (messages.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } else {
      localStorage.removeItem(storageKey);
    }
  }, [messages, storageKey]);

  useEffect(() => {
    localStorage.setItem('nadia-custom-prompts', JSON.stringify(customPrompts));
  }, [customPrompts]);

  const sendMessage = useCallback(async (text: string) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const history = messagesRef.current.map((m) => ({ role: m.role, content: m.content }));
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
          suggestions: data.suggestions,
        },
      ]);
    } catch (err) {
      const msg =
        (err as Error).name === 'AbortError'
          ? 'La requête a pris trop de temps. Essaie de reformuler ta question plus simplement.'
          : 'Une erreur réseau est survenue. Vérifie ta connexion et réessaie.';
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `Désolée, ${msg}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  const savePrompt = useCallback((p: Omit<CustomPrompt, 'id' | 'createdAt'>) => {
    setCustomPrompts((prev) => [{ ...p, id: `prompt-${Date.now()}`, createdAt: Date.now() }, ...prev]);
  }, []);
  const updatePrompt = useCallback((id: string, patch: Partial<CustomPrompt>) => {
    setCustomPrompts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);
  const deletePrompt = useCallback((id: string) => {
    setCustomPrompts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return (
    <ChatContext.Provider
      value={{ messages, isLoading, customPrompts, sendMessage, clearMessages, savePrompt, updatePrompt, deletePrompt }}
    >
      {children}
    </ChatContext.Provider>
  );
}
