import { NadiaChat } from '@/components/chat/NadiaChat';

export default function Home() {
  const userToken = process.env.CRM_USER_TOKEN || 'dev-test-token';

  return (
    <main className="h-screen">
      <NadiaChat userToken={userToken} />
    </main>
  );
}
