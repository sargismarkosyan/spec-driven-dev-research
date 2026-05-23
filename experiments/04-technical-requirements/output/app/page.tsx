'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ALL_CATEGORIES } from '@/lib/types';

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [window, setWindow] = useState<number | ''>('');
  const [enabledCategories, setEnabledCategories] = useState<string[]>([...ALL_CATEGORIES]);
  const [liveFeed, setLiveFeed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [joinId, setJoinId] = useState('');

  const toggleCategory = (cat: string) => {
    setEnabledCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const createSession = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          submissionWindowMinutes: window || undefined,
          enabledCategories,
          liveFeedEnabled: liveFeed,
        }),
      });
      const data = await res.json();
      router.push(`/session/${data.sessionId}?token=${data.facilitatorToken}`);
    } finally {
      setLoading(false);
    }
  };

  const joinSession = () => {
    const id = joinId.trim().replace(/.*\/session\//, '').split('?')[0];
    if (id) router.push(`/session/${id}`);
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Toil Tracker</h1>
          <p className="text-gray-500 mt-1">Run engineering work-audit sessions to find what to automate.</p>
        </div>

        {/* Create Session */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 text-lg">Create a Session</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Session name</label>
            <input
              type="text"
              placeholder="e.g. Platform team — May audit"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createSession()}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Submission window</label>
            <div className="flex gap-2 flex-wrap">
              {[5, 10, 15, 20].map((m) => (
                <button
                  key={m}
                  onClick={() => setWindow(window === m ? '' : m)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    window === m
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400'
                  }`}
                >
                  {m} min
                </button>
              ))}
              <button
                onClick={() => setWindow('')}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  window === ''
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400'
                }`}
              >
                Untimed
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recall prompt categories
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                    enabledCategories.includes(cat)
                      ? 'bg-blue-50 text-blue-700 border-blue-300'
                      : 'bg-white text-gray-400 border-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={liveFeed}
              onChange={(e) => setLiveFeed(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600"
            />
            <span className="text-sm text-gray-700">
              Live team feed (engineers see each other&apos;s submissions)
            </span>
          </label>

          <button
            onClick={createSession}
            disabled={!name.trim() || loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating…' : 'Create Session'}
          </button>
        </div>

        {/* Join Session */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
          <h2 className="font-semibold text-gray-800 text-lg">Join a Session</h2>
          <p className="text-sm text-gray-500">Paste the session link or ID you received.</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Session ID or URL"
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && joinSession()}
              className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={joinSession}
              disabled={!joinId.trim()}
              className="bg-gray-900 hover:bg-gray-700 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-40"
            >
              Join
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
