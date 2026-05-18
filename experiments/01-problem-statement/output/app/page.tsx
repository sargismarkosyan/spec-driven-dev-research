'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Role = 'engineer' | 'facilitator';
type Mode = 'select-role' | 'facilitator-setup' | 'engineer-join';

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role | null>(null);
  const [mode, setMode] = useState<Mode>('select-role');
  const [sessionName, setSessionName] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRoleSelect = (r: Role) => {
    setRole(r);
    setMode(r === 'facilitator' ? 'facilitator-setup' : 'engineer-join');
    setError('');
  };

  const handleFacilitatorStart = async () => {
    if (!name.trim() || !sessionName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: sessionName.trim() }),
      });
      if (!res.ok) throw new Error('Failed to create session');
      const session = await res.json();
      localStorage.setItem('userName', name.trim());
      localStorage.setItem('userRole', 'facilitator');
      router.push(`/session/${session.id}`);
    } catch {
      setError('Could not create session. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  const handleEngineerJoin = async () => {
    if (!name.trim() || !sessionId.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/sessions/${sessionId.trim()}`);
      if (!res.ok) throw new Error('Session not found');
      localStorage.setItem('userName', name.trim());
      localStorage.setItem('userRole', 'engineer');
      router.push(`/session/${sessionId.trim()}`);
    } catch {
      setError('Session not found. Check the ID and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 w-full max-w-sm">
        <h1 className="text-2xl font-semibold mb-1">Toil Tracker</h1>
        <p className="text-gray-500 text-sm mb-6">Audit your work. Find what to fix.</p>

        {mode === 'select-role' && (
          <>
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mb-4
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-3">I am joining as…</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleRoleSelect('engineer')}
                disabled={!name.trim()}
                className="w-full border-2 border-gray-200 hover:border-blue-400 rounded-lg px-4 py-3
                           text-sm text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="font-medium text-gray-800">Engineer</span>
                <span className="block text-xs text-gray-400 mt-0.5">Log my toil activities</span>
              </button>
              <button
                onClick={() => handleRoleSelect('facilitator')}
                disabled={!name.trim()}
                className="w-full border-2 border-gray-200 hover:border-purple-400 rounded-lg px-4 py-3
                           text-sm text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="font-medium text-gray-800">Facilitator</span>
                <span className="block text-xs text-gray-400 mt-0.5">Review and prioritize the team's work</span>
              </button>
            </div>
          </>
        )}

        {mode === 'engineer-join' && (
          <>
            <p className="text-sm text-gray-600 mb-4">
              Joining as <strong>{name}</strong> (Engineer)
            </p>
            <input
              type="text"
              placeholder="Session ID from your facilitator"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleEngineerJoin()}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mb-4
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => { setMode('select-role'); setError(''); }}
                className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleEngineerJoin}
                disabled={!sessionId.trim() || loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5
                           text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? 'Joining…' : 'Join Session'}
              </button>
            </div>
          </>
        )}

        {mode === 'facilitator-setup' && (
          <>
            <p className="text-sm text-gray-600 mb-4">
              Starting as <strong>{name}</strong> (Facilitator)
            </p>
            <input
              type="text"
              placeholder="Session name, e.g. Q2 Toil Audit"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFacilitatorStart()}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mb-4
                         focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => { setMode('select-role'); setError(''); }}
                className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleFacilitatorStart}
                disabled={!sessionName.trim() || loading}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-4 py-2.5
                           text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating…' : 'Create Session'}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
