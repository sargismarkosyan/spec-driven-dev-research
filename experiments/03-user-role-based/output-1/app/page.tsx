'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [joinId, setJoinId] = useState('');
  const router = useRouter();

  const handleJoin = () => {
    const id = joinId.trim();
    if (!id) return;
    router.push(`/session/${id}`);
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Toil Tracker</h1>
          <p className="text-gray-500 mt-2 text-sm">Work audit retros — find what to automate next.</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Facilitator</h2>
          <p className="text-xs text-gray-400 mb-4">Create a new session and share the link with your team.</p>
          <button
            onClick={() => router.push('/session/new')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5
                       text-sm font-medium transition-colors"
          >
            Create Session
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Engineer</h2>
          <p className="text-xs text-gray-400 mb-4">Join a session with the ID from your facilitator.</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Session ID"
              value={joinId}
              onChange={e => setJoinId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleJoin}
              disabled={!joinId.trim()}
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
