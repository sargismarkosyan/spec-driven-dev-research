'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [sessionName, setSessionName] = useState('');
  const [joinId, setJoinId] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const createSession = async () => {
    if (!sessionName.trim()) return;
    setCreating(true);
    setError('');
    try {
      const r = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: sessionName.trim() }),
      });
      if (!r.ok) throw new Error();
      const { sessionId, facilitatorToken } = await r.json();
      router.push(`/session/${sessionId}?facilitator=${facilitatorToken}`);
    } catch {
      setError('Failed to create session. Please try again.');
      setCreating(false);
    }
  };

  const joinSession = () => {
    const id = joinId.trim();
    if (!id) return;
    router.push(`/session/${id}`);
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Toil Tracker</h1>
          <p className="text-gray-500 mt-2">Audit your team&apos;s work. Find what to automate.</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold mb-1">Start a Session</h2>
          <p className="text-gray-500 text-sm mb-4">
            You&apos;ll get a facilitator link to share your team&apos;s join URL.
          </p>
          <input
            type="text"
            placeholder="Session name (e.g. Q2 Toil Audit)"
            value={sessionName}
            onChange={e => setSessionName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createSession()}
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mb-3
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          <button
            onClick={createSession}
            disabled={!sessionName.trim() || creating}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5
                       text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {creating ? 'Creating…' : 'Create Session'}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-sm text-gray-400">or</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold mb-1">Join a Session</h2>
          <p className="text-gray-500 text-sm mb-4">
            Enter the session ID shared by your facilitator.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Session ID"
              value={joinId}
              onChange={e => setJoinId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && joinSession()}
              className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={joinSession}
              disabled={!joinId.trim()}
              className="bg-gray-900 hover:bg-gray-800 text-white rounded-lg px-4 py-2.5
                         text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Join
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
