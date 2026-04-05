'use client';

import { ChatMessage as ChatMessageType } from '@/types';
import { DataTable } from './DataTable';
import { DataChart } from './DataChart';
import { NadiaAvatar } from './NadiaAvatar';

export function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-5 msg-enter`}>
      {!isUser && (
        <div className="flex-shrink-0 mr-3 mt-1">
          <NadiaAvatar size="sm" />
        </div>
      )}

      <div className="max-w-[72%] space-y-3">
        <div
          className={`rounded-2xl px-5 py-3.5 ${
            isUser
              ? 'bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] text-white rounded-br-sm shadow-lg shadow-blue-500/20'
              : 'bg-white text-[#1e293b] shadow-md shadow-gray-200/40 rounded-bl-sm border border-gray-100/50'
          }`}
        >
          <p className="text-[14px] leading-[1.7] whitespace-pre-wrap">{message.content}</p>
        </div>

        {message.data?.type === 'tableau' && message.data.donnees && (
          <DataTable data={message.data.donnees} />
        )}

        {message.data?.type === 'graphique' && message.data.donnees && (
          <DataChart data={message.data.donnees} type={message.data.graphique_type || 'bar'} />
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0 ml-3 mt-1">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#475569] to-[#334155] flex items-center justify-center text-white text-sm font-semibold shadow-md ring-2 ring-white">
            A
          </div>
        </div>
      )}
    </div>
  );
}
