'use client';

import { ChatMessage as ChatMessageType } from '@/types';
import { DataTable } from './DataTable';
import { DataChart } from './DataChart';
import { NadiaAvatar } from './NadiaAvatar';
import { useChat } from './ChatProvider';

export function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === 'user';
  const { sendMessage, isLoading } = useChat();

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6 sm:mb-8 msg-enter`}>
      {!isUser && (
        <div className="flex-shrink-0 mr-2 sm:mr-4 mt-1">
          <NadiaAvatar size="sm" />
        </div>
      )}

      <div className={`max-w-[85%] sm:max-w-[75%] min-w-0 space-y-3 ${isUser ? 'order-1' : 'order-2'}`}>
        <div
          className={`relative rounded-[18px] sm:rounded-[20px] px-4 sm:px-6 py-3 sm:py-4 shadow-sm transition-all hover:shadow-md ${
            isUser
              ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-tr-none border border-blue-500/20'
              : 'bg-white text-slate-800 rounded-tl-none border border-slate-200/60'
          }`}
        >
          <p className="text-[14px] sm:text-[15px] leading-relaxed font-medium whitespace-pre-wrap break-words">{message.content}</p>
        </div>

        {message.data?.type === 'tableau' && message.data.donnees && (
          <div className="mt-4 animate-fade">
            <DataTable data={message.data.donnees} />
          </div>
        )}

        {message.data?.type === 'graphique' && message.data.donnees && (
          <div className="mt-4 animate-fade">
            <DataChart data={message.data.donnees} type={message.data.graphique_type || 'bar'} />
          </div>
        )}

        {!isUser && message.suggestions && message.suggestions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 animate-fade">
            {message.suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => !isLoading && sendMessage(s)}
                disabled={isLoading}
                className="text-[13px] text-blue-700 bg-blue-50 hover:bg-blue-100
                           border border-blue-200/70 rounded-full px-3 py-1.5
                           transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                           text-left"
                title="Cliquer pour relancer cette question"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0 ml-2 sm:ml-4 mt-1 order-2">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 text-[10px] sm:text-xs font-bold shadow-sm">
            MOI
          </div>
        </div>
      )}
    </div>
  );
}
