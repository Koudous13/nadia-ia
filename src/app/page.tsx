import { NadiaChat } from '@/components/chat/NadiaChat';

const DEV_TOKEN = 'dev-test-token';

export default function Home() {
  return (
    <main className="h-screen">
      <NadiaChat userToken={DEV_TOKEN} />
    </main>
  );
}
