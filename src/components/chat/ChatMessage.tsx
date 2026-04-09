'use client';

import { ChatMessage as ChatMessageType } from '@/types';
import { DataTable } from './DataTable';
import { DataChart } from './DataChart';
import { NadiaAvatar } from './NadiaAvatar';

export function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-8 msg-enter`}>
      {!isUser && (
        <div className="flex-shrink-0 mr-4 mt-1">
          <NadiaAvatar size="sm" />
        </div>
      )}

      <div className={`max-w-[75%] space-y-3 ${isUser ? 'order-1' : 'order-2'}`}>
        <div
          className={`relative rounded-[20px] px-6 py-4 shadow-sm transition-all hover:shadow-md ${
            isUser
              ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-tr-none border border-blue-500/20'
              : 'bg-white text-slate-800 rounded-tl-none border border-slate-200/60'
          }`}
        >
          <p className="text-[15px] leading-relaxed font-medium whitespace-pre-wrap">{message.content}</p>
          
          {/* Subtle timestamp or indicator could go here */}
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
      </div>

      {isUser && (
        <div className="flex-shrink-0 ml-4 mt-1 order-2">
          <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold shadow-sm">
            MOI
          </div>
        </div>
      )}
    </div>
  );
}
