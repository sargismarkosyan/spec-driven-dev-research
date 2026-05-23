'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const WINDOW_OPTIONS = [
  { label: 'Untimed', value: null },
  { label: '5 min', value: 5 },
  { label: '10 min', value: 10 },
  { label: '15 min', value: 15 },
  { label: '20 min', value: 20 },
];

const CATEGORIES = [
  { id: 'yesterday', label: 'Yesterday & this week' },
  { id: 'meetings', label: 'Weekly meetings' },
  { id: 'rituals', label: 'Monthly rituals' },
  { id: 'oncall', label: 'On-call & incidents' },
  { id: 'quarterly', label: 'Quarterly cycles' },
  { id: 'chores', label: 'Manual chores' },
  { id: 'handoffs', label: 'Handoffs & coordination' },
  { id: 'automation', label: 'Things I wish we automated' },
  { id: 'other', label: 'Other recurring work' },
] as const;

export default function Home() {
  const router = useRouter();
  const [tab, setTab] = useState<'create' | 'join'>('create');

  // Create form
  const [sessionName, setSessionName] = useState('');
  const [window_, setWindow_] = useState<number | null>(null);
  const [liveFeed, setLiveFeed] = useState(true);
  const [enabledCats, setEnabledCats] = useState<Set<string>>(
    new Set(CATEGORIES.map((c) => c.id))
  );
  const [creating, setCreating] = useState(false);

  // Join form
  const [joinLink, setJoinLink] = useState('');

  const toggleCat = (id: string) => {
    setEnabledCats((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!sessionName.trim()) return;
    setCreating(true);
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: sessionName.trim(),
        windowMinutes: window_,
        enabledCategories: Array.from(enabledCats),
        liveFeedEnabled: liveFeed,
      }),
    });
    const data = await res.json();
    localStorage.setItem(`fac_token_${data.session.id}`, data.facilitatorToken);
    router.push(`/session/${data.session.id}/lobby?token=${data.facilitatorToken}`);
  };

  const handleJoin = () => {
    // Accept either a full URL or a session id
    const match = joinLink.match(/session\/([^/]+)\/join/);
    const id = match ? match[1] : joinLink.trim();
    if (id) router.push(`/session/${id}/join`);
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-lg">
        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {(['create', 'join'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                tab === t
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'create' ? 'Create session' : 'Join session'}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === 'create' ? (
            <div className="flex flex-col gap-5">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Session name</label>
                <input
                  type="text"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="Q2 toil review"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Submission window</label>
                <div className="flex gap-2 flex-wrap">
                  {WINDOW_OPTIONS.map((o) => (
                    <button
                      key={String(o.value)}
                      onClick={() => setWindow_(o.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        window_ === o.value
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-200 text-gray-600 hover:border-blue-300'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Recall prompt categories</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => toggleCat(c.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        enabledCats.has(c.id)
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          : 'border-gray-200 text-gray-400'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Live team feed</span>
                <button
                  onClick={() => setLiveFeed(!liveFeed)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    liveFeed ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    liveFeed ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <button
                onClick={handleCreate}
                disabled={!sessionName.trim() || creating}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-40"
              >
                {creating ? 'Creating…' : 'Create session'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-gray-500">Paste the join link from the facilitator.</p>
              <input
                type="text"
                value={joinLink}
                onChange={(e) => setJoinLink(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                placeholder="https://… or session id"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleJoin}
                disabled={!joinLink.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-40"
              >
                Go to session
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
