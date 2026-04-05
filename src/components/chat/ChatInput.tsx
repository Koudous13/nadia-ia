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
        flex items-center gap-3 bg-white rounded-2xl px-5 py-3
        transition-all duration-300
        ${focused
          ? 'shadow-xl shadow-blue-500/10 ring-2 ring-blue-400/30 border border-blue-200'
          : 'shadow-md shadow-gray-200/50 border border-gray-100 hover:shadow-lg hover:border-gray-200'
        }
      `}
    >
      {/* Search icon */}
      <svg className={`w-5 h-5 flex-shrink-0 transition-colors duration-200 ${focused ? 'text-blue-400' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>

      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={e => setText(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        placeholder="Envoyer une instruction..."
        disabled={disabled}
        className="flex-1 bg-transparent outline-none text-[14px] text-gray-700 placeholder:text-gray-400 disabled:opacity-50"
      />

      {/* Send button */}
      <button
        onClick={handleSubmit}
        disabled={disabled || !text.trim()}
        className={`
          flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center
          transition-all duration-200
          ${text.trim()
            ? 'bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-105 active:scale-95'
            : 'bg-gray-100 text-gray-300 cursor-not-allowed'
          }
          disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100
        `}
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
        </svg>
      </button>
    </div>
  );
}
