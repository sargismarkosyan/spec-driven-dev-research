'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getEngName, getEngRole } from '@/lib/client/storage';
import { SessionProvider, useSessionContext, SessionConnectionFallback } from '@/hooks/useSession';
import { EngineerBoard } from '@/components/engineer/EngineerBoard';

function BoardInner({ sessionId }: { sessionId: string }) {
  const { session, loading, joinError, participantId, retryJoin } = useSessionContext();
  const name = getEngName(sessionId) ?? 'Engineer';

  if (joinError) {
    return <SessionConnectionFallback message={joinError} onRetry={retryJoin} />;
  }

  if (loading || !session) {
    return (
      <div className="wa-screen" style={{ alignItems: 'center', justifyContent: 'center' }}>
        Connecting…
      </div>
    );
  }

  return (
    <EngineerBoard session={session} participantId={participantId ?? ''} name={name} />
  );
}

export default function BoardPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [name, setName] = useState<string | null>(null);
  const [role, setRole] = useState('IC');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const savedName = getEngName(params.id);
    if (!savedName) {
      router.replace(`/session/${params.id}`);
      return;
    }
    setName(savedName);
    setRole(getEngRole(params.id));
    setReady(true);
  }, [params.id, router]);

  const joinParams = useMemo(
    () => (name ? { name, role, isFacilitator: false as const } : undefined),
    [name, role],
  );

  if (!ready || !name || !joinParams) {
    return (
      <div className="wa-screen" style={{ alignItems: 'center', justifyContent: 'center' }}>
        ROUTING…
      </div>
    );
  }

  return (
    <SessionProvider sessionId={params.id} joinParams={joinParams}>
      <BoardInner sessionId={params.id} />
    </SessionProvider>
  );
}
