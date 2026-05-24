'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { SerializedSession } from '@/lib/domain/types';
import {
  getEngName,
  getFacilitatorToken,
  setFacilitatorToken,
} from '@/lib/client/storage';

/** Smart router: facilitator lobby/view, engineer board, or join screen. */
export default function SessionPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlToken = searchParams.get('token');

  useEffect(() => {
    const resolve = async () => {
      let token = urlToken;
      if (token) {
        setFacilitatorToken(params.id, token);
      } else {
        token = getFacilitatorToken(params.id);
      }

      if (token) {
        try {
          const res = await fetch(`/api/sessions/${params.id}`);
          if (res.ok) {
            const session: SerializedSession = await res.json();
            if (session.status === 'lobby') {
              router.replace(`/session/${params.id}/lobby?token=${token}`);
            } else {
              router.replace(`/session/${params.id}/facilitator?token=${token}`);
            }
            return;
          }
        } catch {
          // fall through
        }
        router.replace(`/session/${params.id}/facilitator?token=${token}`);
        return;
      }

      const savedName = getEngName(params.id);
      if (savedName) {
        router.replace(`/session/${params.id}/board`);
        return;
      }

      router.replace(`/session/${params.id}/join`);
    };

    resolve();
  }, [params.id, urlToken, router]);

  return (
    <div className="wa-screen" style={{ alignItems: 'center', justifyContent: 'center' }}>
      ROUTING…
    </div>
  );
}
