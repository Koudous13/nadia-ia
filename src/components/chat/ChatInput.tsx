'use client';

import { useState, useRef } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
    inputRef.current?.focus();
  };

  return (
    <div
      className={`
        relative flex items-center gap-3 bg-white rounded-[24px] px-6 py-4
        transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
        ${focused
          ? 'shadow-[0_20px_50px_rgba(37,99,235,0.15)] ring-1 ring-blue-500/20 translate-y-[-2px]'
          : 'shadow-[0_10px_30px_rgba(0,0,0,0.04)] border border-slate-100 hover:border-slate-200'
        }
      `}
    >
      <div className={`p-2 rounded-xl transition-colors duration-300 ${focused ? 'bg-blue-50 text-blue-600' : 'text-slate-400'}`}>
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={e => setText(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        placeholder="Posez une question à Nadia..."
        disabled={disabled}
        className="flex-1 bg-transparent outline-none text-[15px] font-medium text-slate-700 placeholder:text-slate-400 disabled:opacity-50"
      />

      {/* Send button */}
      <button
        onClick={handleSubmit}
        disabled={disabled || !text.trim()}
        className={`
          group relative flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center
          transition-all duration-300 overflow-hidden
          ${text.trim()
            ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 active:scale-95'
            : 'bg-slate-100 text-slate-300 cursor-not-allowed'
          }
        `}
      >
        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
        <svg className="w-5 h-5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      </button>
    </div>
  );
}
