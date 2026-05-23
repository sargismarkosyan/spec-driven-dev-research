'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const PROMPT_CATEGORIES = [
  { id: 'yesterday-week', label: 'Yesterday & this week' },
  { id: 'weekly-meetings', label: 'Weekly meetings' },
  { id: 'on-call', label: 'On-call & incidents' },
  { id: 'chores', label: 'Manual chores' },
];

const WINDOW_OPTIONS = [
  { label: 'Untimed', value: null },
  { label: '5 min', value: 5 },
  { label: '10 min', value: 10 },
  { label: '15 min', value: 15 },
  { label: '20 min', value: 20 },
];

export default function Home() {
  const router = useRouter();
  const [tab, setTab] = useState<'create' | 'join'>('create');

  // Create session fields
  const [sessionName, setSessionName] = useState('');
  const [facilitatorName, setFacilitatorName] = useState('');
  const [windowMinutes, setWindowMinutes] = useState<number | null>(null);
  const [showTeamFeed, setShowTeamFeed] = useState(true);
  const [enabledCategories, setEnabledCategories] = useState<string[]>(
    PROMPT_CATEGORIES.map((c) => c.id)
  );
  const [creating, setCreating] = useState(false);

  // Join session fields
  const [joinCode, setJoinCode] = useState('');

  const toggleCategory = (id: string) => {
    setEnabledCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (!sessionName.trim() || !facilitatorName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: sessionName.trim(),
          facilitatorName: facilitatorName.trim(),
          submissionWindowMinutes: windowMinutes,
          showTeamFeedToEngineers: showTeamFeed,
          enabledPromptCategoryIds: enabledCategories,
        }),
      });
      const { id, facilitatorId } = await res.json();
      localStorage.setItem(`session_${id}_facilitatorId`, facilitatorId);
      localStorage.setItem(`session_${id}_name`, facilitatorName.trim());
      localStorage.setItem(`session_${id}_role`, 'facilitator');
      router.push(`/session/${id}`);
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = () => {
    const code = joinCode.trim();
    if (!code) return;
    router.push(`/session/${code}`);
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-md">
        <h1 className="text-2xl font-semibold mb-1">Work Audit</h1>
        <p className="text-gray-500 text-sm mb-6">
          A retro format for finding what to fix, automate, or drop.
        </p>

        {/* Tabs */}
        <div className="flex border border-gray-200 rounded-lg mb-6 overflow-hidden">
          <button
            onClick={() => setTab('create')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              tab === 'create' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Create session
          </button>
          <button
            onClick={() => setTab('join')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              tab === 'join' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Join session
          </button>
        </div>

        {tab === 'create' && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">
                Session name
              </label>
              <input
                type="text"
                placeholder="e.g. Platform team Q2 retro"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">
                Your name (facilitator)
              </label>
              <input
                type="text"
                placeholder="Your name"
                value={facilitatorName}
                onChange={(e) => setFacilitatorName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">
                Submission window
              </label>
              <div className="flex gap-2">
                {WINDOW_OPTIONS.map((opt) => (
                  <button
                    key={String(opt.value)}
                    onClick={() => setWindowMinutes(opt.value)}
                    className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${
                      windowMinutes === opt.value
                        ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">
                Prompt categories
              </label>
              <div className="flex flex-col gap-1.5">
                {PROMPT_CATEGORIES.map((cat) => (
                  <label key={cat.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enabledCategories.includes(cat.id)}
                      onChange={() => toggleCategory(cat.id)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-gray-700">{cat.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={showTeamFeed}
                  onChange={(e) => setShowTeamFeed(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-gray-700">Show team feed to engineers in real time</span>
              </label>
            </div>

            <button
              onClick={handleCreate}
              disabled={!sessionName.trim() || !facilitatorName.trim() || creating}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5
                         text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating…' : 'Create session'}
            </button>
          </div>
        )}

        {tab === 'join' && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">
                Session code
              </label>
              <input
                type="text"
                placeholder="Paste the session ID or link"
                value={joinCode}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  // Accept full URL or just the ID
                  const match = v.match(/session\/([a-z0-9-]+)/);
                  setJoinCode(match ? match[1] : v);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleJoin}
              disabled={!joinCode.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5
                         text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Join session
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
