'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const createSession = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facilitatorName: name.trim() }),
      });
      const data = await res.json();
      localStorage.setItem(`session_${data.id}_name`, name.trim());
      localStorage.setItem(`session_${data.id}_role`, 'facilitator');
      router.push(`/session/${data.id}`);
    } catch {
      setError('Failed to create session.');
      setLoading(false);
    }
  };

  const joinSession = () => {
    const id = code.trim();
    if (!id || !name.trim()) return;
    localStorage.setItem(`session_${id}_name`, name.trim());
    localStorage.setItem(`session_${id}_role`, 'engineer');
    router.push(`/session/${id}`);
  };

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 w-full max-w-sm">
        <h1 className="text-2xl font-semibold mb-1">Toil Tracker</h1>
        <p className="text-gray-500 text-sm mb-6">Audit your team&apos;s work. Find what to fix.</p>

        <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setTab('create')}
            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === 'create' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Create session
          </button>
          <button
            onClick={() => setTab('join')}
            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === 'join' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Join session
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {tab === 'join' && (
            <input
              type="text"
              placeholder="Session code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (tab === 'create' ? createSession() : joinSession())}
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            onClick={tab === 'create' ? createSession : joinSession}
            disabled={loading || !name.trim() || (tab === 'join' && !code.trim())}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5
                       text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {tab === 'create' ? (loading ? 'Creating…' : 'Create session') : 'Join session'}
          </button>
        </div>
      </div>
    </main>
  );
}
