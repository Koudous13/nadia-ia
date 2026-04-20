import { ChatProvider } from '@/components/chat/ChatProvider';
import { ChatShell } from '@/components/chat/ChatShell';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <ChatProvider>
      <ChatShell />
      <div className="hidden">{children}</div>
    </ChatProvider>
  );
}
