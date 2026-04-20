'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
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

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [customPrompts, setCustomPrompts] = useState<CustomPrompt[]>([]);
  const messagesRef = useRef<ChatMessage[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('nadia-chat-history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as ChatMessage[];
        const restored = parsed.map((m) => ({ ...m, timestamp: new Date(m.timestamp) }));
        setMessages(restored);
        messagesRef.current = restored;
      } catch {}
    }
    const savedP = localStorage.getItem('nadia-custom-prompts');
    if (savedP) {
      try {
        setCustomPrompts(JSON.parse(savedP));
      } catch {}
    }
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
    if (messages.length > 0) {
      localStorage.setItem('nadia-chat-history', JSON.stringify(messages));
    } else {
      localStorage.removeItem('nadia-chat-history');
    }
  }, [messages]);

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
    localStorage.removeItem('nadia-chat-history');
  }, []);

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
