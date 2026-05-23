'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [sessionName, setSessionName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  const createSession = async () => {
    if (!sessionName.trim() || creating) return;
    setCreating(true);
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: sessionName.trim() }),
    });
    const session = await res.json();
    router.push(`/session/${session.id}/facilitate`);
  };

  const joinSession = () => {
    const id = joinCode.trim();
    if (!id) return;
    router.push(`/session/${id}`);
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold">Toil Tracker</h1>
          <p className="text-gray-500 mt-2">Audit your work. Find what to fix.</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4">
            Facilitator — Start a session
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Session name (e.g. Sprint 42 Toil Review)"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createSession()}
              className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={createSession}
              disabled={!sessionName.trim() || creating}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5
                         text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4">
            Engineer — Join a session
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Session ID"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && joinSession()}
              className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={joinSession}
              disabled={!joinCode.trim()}
              className="bg-gray-800 hover:bg-gray-900 text-white rounded-lg px-4 py-2.5
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
