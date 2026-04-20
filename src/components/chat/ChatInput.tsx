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
      className={`flex items-center gap-3 bg-white rounded-2xl pl-5 pr-2 py-2 border transition-all ${
        focused ? 'border-blue-300 shadow-lg shadow-blue-500/10' : 'border-slate-200 shadow-sm'
      }`}
    >
      <button
        type="button"
        className="text-slate-400 hover:text-slate-600 transition-colors"
        aria-label="Dicter"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="2" width="6" height="12" rx="3" />
          <path d="M19 10a7 7 0 0 1-14 0M12 19v3" />
        </svg>
      </button>

      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        placeholder="Envoyer une instruction..."
        disabled={disabled}
        className="flex-1 bg-transparent outline-none text-[15px] text-slate-700 placeholder:text-slate-400 disabled:opacity-50 py-2"
      />

      <button
        onClick={handleSubmit}
        disabled={disabled || !text.trim()}
        className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
          text.trim()
            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/25 active:scale-95'
            : 'bg-slate-100 text-slate-300 cursor-not-allowed'
        }`}
        aria-label="Envoyer"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 2L11 13" />
          <path d="M22 2l-7 20-4-9-9-4 20-7z" />
        </svg>
      </button>
    </div>
  );
}
