'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { socket } from '@/lib/socket';

type User = { id: string; name: string };
type Note = { id: string; authorName: string; text: string };

export default function CanvasPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    const name = localStorage.getItem('userName');
    if (!name) { router.push('/'); return; }

    socket.connect();
    socket.emit('join', name);

    socket.on('state', (s: { users: User[]; notes: Note[] }) => {
      setUsers(s.users);
      setNotes(s.notes);
    });

    socket.on('user:joined', (user: User) => {
      setUsers((prev) => [...prev.filter((u) => u.id !== user.id), user]);
    });

    socket.on('user:left', (id: string) => {
      setUsers((prev) => prev.filter((u) => u.id !== id));
    });

    socket.on('note:added', (note: Note) => {
      setNotes((prev) => [...prev, note]);
    });

    return () => { socket.disconnect(); };
  }, [router]);

  const addNote = () => {
    if (!input.trim()) return;
    socket.emit('note:add', input.trim());
    setInput('');
  };

  return (
    <div className="min-h-screen flex">

      {/* Sidebar — presence */}
      <aside className="w-52 bg-white border-r border-gray-100 p-4 flex flex-col">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
          Connected ({users.length})
        </p>
        <ul className="flex flex-col gap-2">
          {users.map((u) => (
            <li key={u.id} className="flex items-center gap-2 text-sm text-gray-700">
              <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
              {u.name}
            </li>
          ))}
        </ul>
      </aside>

      {/* Main — shared canvas */}
      <main className="flex-1 p-6 flex flex-col gap-4">

        {/* Add note */}
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addNote()}
            placeholder="Add a note to the canvas..."
            className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={addNote}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5
                       text-sm font-medium transition-colors"
          >
            Add
          </button>
        </div>

        {/* Notes grid */}
        {notes.length === 0 ? (
          <p className="text-sm text-gray-400 mt-4">
            No notes yet. Add one above or wait for teammates.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"
              >
                <p className="text-sm text-gray-800">{note.text}</p>
                <p className="text-xs text-gray-400 mt-2">{note.authorName}</p>
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}
