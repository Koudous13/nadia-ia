'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
}

type SRResult = { 0: { transcript: string }; isFinal: boolean };
type SRInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<SRResult> & { length: number }; resultIndex: number }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SRCtor = new () => SRInstance;

function getSR(): SRCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SRInstance | null>(null);
  const baseTextRef = useRef('');

  useEffect(() => {
    setSupported(!!getSR());
  }, []);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }, []);

  const startListening = useCallback(() => {
    const SR = getSR();
    if (!SR) return;

    const rec = new SR();
    rec.lang = 'fr-FR';
    rec.continuous = true;
    rec.interimResults = true;

    baseTextRef.current = text ? text.replace(/\s+$/, '') + ' ' : '';

    rec.onresult = (e) => {
      let interim = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) final += r[0].transcript;
        else interim += r[0].transcript;
      }
      if (final) {
        baseTextRef.current = (baseTextRef.current + final).replace(/\s{2,}/g, ' ');
        if (!baseTextRef.current.endsWith(' ')) baseTextRef.current += ' ';
      }
      setText((baseTextRef.current + interim).replace(/\s{2,}/g, ' '));
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        alert("Accès au micro refusé. Autorise-le dans les paramètres du navigateur.");
      }
      setListening(false);
    };
    rec.onend = () => setListening(false);

    try {
      rec.start();
      recognitionRef.current = rec;
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [text]);

  const toggleMic = () => (listening ? stopListening() : startListening());

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    if (listening) stopListening();
    onSend(trimmed);
    setText('');
    inputRef.current?.focus();
  };

  const micTitle = !supported
    ? "Dictée non supportée par ce navigateur (utilise Chrome ou Edge)"
    : listening
      ? "Cliquer pour arrêter la dictée"
      : "Dicter à voix haute";

  return (
    <div
      className={`flex items-center gap-3 bg-white rounded-2xl pl-5 pr-2 py-2 border transition-all ${
        focused ? 'border-blue-300 shadow-lg shadow-blue-500/10' : 'border-slate-200 shadow-sm'
      }`}
    >
      <button
        type="button"
        onClick={supported ? toggleMic : undefined}
        disabled={!supported || disabled}
        className={`relative flex items-center justify-center w-9 h-9 rounded-full transition-colors ${
          listening
            ? 'text-red-600 bg-red-50'
            : supported
              ? 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              : 'text-slate-300 cursor-not-allowed'
        }`}
        aria-label={listening ? "Arrêter la dictée" : "Dicter"}
        title={micTitle}
      >
        {listening && (
          <span className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
        )}
        <svg className="w-5 h-5 relative" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
        placeholder={listening ? "🎙 J'écoute…" : "Envoyer une instruction..."}
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
