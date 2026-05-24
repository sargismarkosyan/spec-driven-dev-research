'use client';

import { useParams } from 'next/navigation';
import { Topbar } from '@/app/components/Primitives';

export default function BoardPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <div className="wa-layout">
      <Topbar title="Engineer Board" sub="BOARD · COMING SOON" />
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 12,
        color: 'var(--muted)',
      }}>
        <div className="wa-eyebrow">Session {id}</div>
        <p style={{ fontSize: 14, margin: 0 }}>Engineer board — implementation coming in Task 8.</p>
      </div>
    </div>
  );
}
