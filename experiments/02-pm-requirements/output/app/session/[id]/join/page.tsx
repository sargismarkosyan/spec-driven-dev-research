'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

const ROLES = ['IC', 'EM', 'PM', 'UX', 'Other'] as const;

export default function JoinPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const sessionId = params.id;

  const [name, setName] = useState('');
  const [role, setRole] = useState<string>('IC');
  const [sessionName, setSessionName] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}`)
      .then((r) => r.json())
      .then((d) => d.name && setSessionName(d.name))
      .catch(() => {});
  }, [sessionId]);

  const handleJoin = () => {
    if (!name.trim()) return;
    setJoining(true);
    localStorage.setItem(`participant_${sessionId}`, JSON.stringify({ name: name.trim(), role }));
    router.push(`/session/${sessionId}/board`);
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-sm p-6">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Joining session</p>
        <h1 className="text-xl font-semibold text-gray-900 mb-5">{sessionName || '…'}</h1>

        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Your name</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              placeholder="First name or handle"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">Role <span className="font-normal">(optional)</span></label>
            <div className="flex gap-2 flex-wrap">
              {ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    role === r
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-200 text-gray-600 hover:border-blue-300'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleJoin}
            disabled={!name.trim() || joining}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-40"
          >
            {joining ? 'Joining…' : 'Join session'}
          </button>
        </div>
      </div>
    </main>
  );
}
