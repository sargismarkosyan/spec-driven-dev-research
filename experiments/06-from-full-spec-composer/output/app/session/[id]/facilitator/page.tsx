'use client';

import { useEffect, useState } from 'react';
import { SessionProvider } from '@/hooks/useSession';
import { useSearchParams } from 'next/navigation';
import { getFacilitatorToken, setFacilitatorToken } from '@/lib/client/storage';
import { FacilitatorHub } from '@/components/facilitator/FacilitatorHub';

export default function FacilitatorPage({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const urlToken = searchParams.get('token');
  const [token, setToken] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (urlToken) {
      setFacilitatorToken(params.id, urlToken);
      setToken(urlToken);
      return;
    }
    setToken(getFacilitatorToken(params.id));
  }, [params.id, urlToken]);

  if (token === undefined) {
    return (
      <div className="wa-screen" style={{ alignItems: 'center', justifyContent: 'center' }}>
        Loading…
      </div>
    );
  }

  if (!token) {
    return (
      <div className="wa-screen" style={{ alignItems: 'center', justifyContent: 'center' }}>
        Facilitator token required
      </div>
    );
  }

  return (
    <SessionProvider
      sessionId={params.id}
      joinParams={{ name: 'Facilitator', isFacilitator: true, token }}
    >
      <FacilitatorHub sessionId={params.id} token={token} />
    </SessionProvider>
  );
}
