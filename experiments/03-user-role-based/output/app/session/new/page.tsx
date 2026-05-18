'use client';

import { useState } from 'react';

type Created = { id: string; title: string };

export default function NewSessionPage() {
  const [title, setTitle] = useState('');
  const [created, setCreated] = useState<Created | null>(null);
  const [loading, setLoading] = useState(false);

  const create = async () => {
    if (!title.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() }),
      });
      const data = await res.json();
      setCreated(data);
    } finally {
      setLoading(false);
    }
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  if (created) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 w-full max-w-lg">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">Session created</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-6">{created.title}</h1>

          <div className="space-y-4">
            <LinkBox label="Engineer link — share this in the meeting" href={`${origin}/session/${created.id}`} />
            <LinkBox label="Facilitator view — results & priorities" href={`${origin}/session/${created.id}/facilitate`} />
          </div>

          <p className="text-xs text-gray-400 mt-6">
            Session ID: <span className="font-mono">{created.id}</span>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 w-full max-w-sm">
        <h1 className="text-2xl font-semibold mb-1">New Session</h1>
        <p className="text-gray-500 text-sm mb-6">Give this work audit session a short name.</p>

        <input
          type="text"
          placeholder="e.g. Q2 Work Audit"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && create()}
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mb-4
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
        <button
          onClick={create}
          disabled={!title.trim() || loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5
                     text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating…' : 'Create Session'}
        </button>
      </div>
    </main>
  );
}

function LinkBox({ label, href }: { label: string; href: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-gray-100 rounded-lg p-4">
      <p className="text-xs text-gray-500 mb-2">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-xs bg-gray-50 rounded px-2 py-1.5 text-gray-700 truncate">{href}</code>
        <button
          onClick={copy}
          className="shrink-0 text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-xs text-gray-500 hover:text-gray-700 font-medium"
        >
          Open
        </a>
      </div>
    </div>
  );
}
