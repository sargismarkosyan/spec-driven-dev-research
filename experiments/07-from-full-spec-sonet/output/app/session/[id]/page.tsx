'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function SessionRouter() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  useEffect(() => {
    if (!id) return;

    const searchParams = new URLSearchParams(window.location.search);
    const urlToken = searchParams.get('token');
    const storedToken = localStorage.getItem(`wa-facilitator-token-${id}`);
    const token = urlToken || storedToken;

    if (token) {
      router.replace(`/session/${id}/facilitator?token=${token}`);
      return;
    }

    const engName = localStorage.getItem(`wa-eng-name-${id}`);
    if (engName) {
      router.replace(`/session/${id}/board`);
    } else {
      router.replace(`/session/${id}/join`);
    }
  }, [id, router]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100dvh',
      flexDirection: 'column',
      gap: 14,
      background: 'var(--paper)',
    }}>
      <div style={{
        width: 22,
        height: 22,
        borderRadius: '50%',
        border: '2px solid var(--rule)',
        borderTopColor: 'var(--ink)',
        animation: 'wa-spin 0.8s linear infinite',
      }} />
      <span className="wa-eyebrow">Loading…</span>
      <style>{`@keyframes wa-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
