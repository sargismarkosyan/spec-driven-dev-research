'use client';

// Smart dispatcher: reads session status + role and routes accordingly.
//
//   Has ?token= that matches facilitatorToken → facilitator view (lobby or main)
//   Has engineer name in localStorage       → board (status-aware)
//   Neither                                 → join page

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SessionRoot({ params }: { params: { id: string } }) {
  const { id }       = params;
  const router       = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token    = searchParams.get('token');
    const engName  = localStorage.getItem(`wa-eng-name-${id}`);
    const facToken = localStorage.getItem(`wa-token-${id}`);

    const isFacilitator = !!(token || facToken);

    if (isFacilitator) {
      const t = token ?? facToken ?? '';
      // Verify token against server, then route to lobby or facilitator view
      fetch(`/api/sessions/${id}`)
        .then(r => r.json())
        .then(session => {
          if (!session || session.error) { router.replace('/'); return; }
          if (session.status === 'lobby') {
            router.replace(`/session/${id}/lobby?token=${t}`);
          } else {
            router.replace(`/session/${id}/facilitator?token=${t}`);
          }
        })
        .catch(() => router.replace('/'));
      return;
    }

    if (engName) {
      router.replace(`/session/${id}/board`);
      return;
    }

    // Unknown visitor — send to join
    router.replace(`/session/${id}/join`);
  }, [id, router, searchParams]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: 'var(--paper)' }}>
      <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.06em' }}>
        ROUTING…
      </span>
    </div>
  );
}
