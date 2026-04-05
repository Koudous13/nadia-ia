import { NadiaChat } from '@/components/chat/NadiaChat';

const DEV_TOKEN = 'pqoTGVHTZy9yype8iXtaenFeTIZKyKVTKxXKGZLB7yZLtGuQ2ondRFHKkBiwmivL';

export default function Home() {
  return (
    <main className="h-screen">
      <NadiaChat userToken={DEV_TOKEN} />
    </main>
  );
}
