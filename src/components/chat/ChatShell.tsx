'use client';

import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useChat } from './ChatProvider';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { ChatInput } from './ChatInput';
import { ChatMessage } from './ChatMessage';
import { labelForRoute, routeForLabel } from '@/lib/nav-routes';
import { promptFor } from '@/lib/nav-prompts';

export function ChatShell() {
  const router = useRouter();
  const pathname = usePathname();
  const { messages, isLoading, sendMessage, clearMessages } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastNavHandled = useRef<string | null>(null);

  const activeLabel = labelForRoute(pathname);

  useEffect(() => {
    if (lastNavHandled.current === pathname) return;
    const isFirstMount = lastNavHandled.current === null;
    lastNavHandled.current = pathname;
    if (isFirstMount) return;
    if (activeLabel && activeLabel !== 'Assistant IA') {
      sendMessage(promptFor(activeLabel));
    }
  }, [pathname, activeLabel, sendMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isLoading]);

  const handleShortcut = (label: string) => {
    const path = routeForLabel(label);
    if (pathname === path) {
      sendMessage(promptFor(label));
    } else {
      router.push(path);
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/30 font-sans overflow-hidden">
      <Sidebar onNavigate={handleShortcut} activePath={pathname} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopHeader
          userName="Ali"
          notificationCount={3}
          onClearConversation={() => {
            if (messages.length === 0) return;
            if (window.confirm('Vider la conversation ?')) clearMessages();
          }}
        />

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

        <div className="px-8 pb-6 pt-3">
          <div className="max-w-4xl mx-auto w-full">
            <ChatInput onSend={sendMessage} disabled={isLoading} />
          </div>
        </div>
      </div>
    </div>
  );
}

function WelcomeHero() {
  return (
    <div className="max-w-5xl mx-auto h-full flex items-center justify-center py-8">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-6 items-center w-full">
        <div className="space-y-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl px-7 py-6 shadow-sm border border-white/80">
            <p className="text-[22px] font-semibold text-slate-800 leading-snug">
              Bonjour !<br />
              Que puis-je analyser ou faire pour vous aujourd&apos;hui ?
            </p>
          </div>
          <p className="text-[14px] text-slate-500 italic px-2">En attente d&apos;une instruction...</p>
        </div>
        <div className="relative w-full aspect-[4/3] max-w-[520px] mx-auto">
          <Image src="/nadia-illustration.png" alt="Nadia" fill priority className="object-contain" />
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
