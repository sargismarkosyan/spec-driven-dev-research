'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [name, setName] = useState('');
  const router = useRouter();

  const handleJoin = () => {
    if (!name.trim()) return;
    localStorage.setItem('userName', name.trim());
    router.push('/canvas');
  };

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 w-full max-w-sm">
        <h1 className="text-2xl font-semibold mb-1">Toil Tracker</h1>
        <p className="text-gray-500 text-sm mb-6">Enter your name to join the shared canvas.</p>

        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mb-4
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleJoin}
          disabled={!name.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5
                     text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Join Canvas
        </button>
      </div>
    </main>
  );
}
