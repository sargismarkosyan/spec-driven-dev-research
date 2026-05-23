'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { socket } from '@/lib/socket';

type Participant = {
  id: string;
  name: string;
  role: string;
  joinedAt: string;
  isFacilitator: boolean;
};

function initials(name: string) {
  return name.split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

function QRCode({ url }: { url: string }) {
  // Simple placeholder — real QR would use a library
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-32 h-32 bg-gray-100 rounded-xl border border-gray-200 flex items-center justify-center text-xs text-gray-400 text-center p-2">
        QR for {url.length > 30 ? url.slice(0, 30) + '…' : url}
      </div>
    </div>
  );
}

export default function LobbyPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const sessionId = params.id;
  const token = searchParams.get('token') || localStorage.getItem(`fac_token_${sessionId}`) || '';

  const [sessionName, setSessionName] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [joinUrl, setJoinUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [slackCopied, setSlackCopied] = useState(false);

  useEffect(() => {
    const url = `${window.location.origin}/session/${sessionId}/join`;
    setJoinUrl(url);

    fetch(`/api/sessions/${sessionId}`)
      .then((r) => r.json())
      .then((d) => {
        setSessionName(d.name);
        setParticipants((d.participants || []).filter((p: Participant) => !p.isFacilitator));
      });

    socket.connect();
    socket.emit('session:join', {
      sessionId,
      name: 'Facilitator',
      role: 'facilitator',
      facilitatorToken: token,
    });

    socket.on('session:participant_joined', (p: Participant) => {
      if (!p.isFacilitator) setParticipants((prev) => [...prev.filter((x) => x.id !== p.id), p]);
    });
    socket.on('session:participant_left', (id: string) => {
      setParticipants((prev) => prev.filter((p) => p.id !== id));
    });

    return () => {
      socket.off('session:participant_joined');
      socket.off('session:participant_left');
      socket.disconnect();
    };
  }, [sessionId, token]);

  const engineerCount = participants.length;

  const copyUrl = async () => {
    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const slackMsg = `Hey team! Join our Toil Tracker session "${sessionName}" here: ${joinUrl}\nTakes ~10 min — just your name to join, no account needed.`;
  const copySlack = async () => {
    await navigator.clipboard.writeText(slackMsg);
    setSlackCopied(true);
    setTimeout(() => setSlackCopied(false), 2000);
  };

  const startSession = () => {
    router.push(`/session/${sessionId}/facilitator?token=${token}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto p-6 flex flex-col gap-6">
        {/* Header */}
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Session lobby</p>
          <h1 className="text-2xl font-semibold text-gray-900">{sessionName}</h1>
        </div>

        {/* Join link card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-4">
          <p className="text-sm font-medium text-gray-700">Share this link with your team</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={joinUrl}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 font-mono"
            />
            <button
              onClick={copyUrl}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          <QRCode url={joinUrl} />

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-medium text-gray-500 mb-2">Slack message template</p>
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 font-mono whitespace-pre-wrap">{slackMsg}</div>
            <button
              onClick={copySlack}
              className="mt-2 text-xs text-blue-600 hover:text-blue-700"
            >
              {slackCopied ? '✓ Copied' : 'Copy to clipboard'}
            </button>
          </div>
        </div>

        {/* Participants */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-700">
              Participants <span className="text-gray-400">({engineerCount})</span>
            </p>
          </div>

          {participants.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
              <p className="text-sm text-gray-400">Waiting for engineers to join…</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {participants.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold">
                    {initials(p.name)}
                  </div>
                  <div className="flex-1">
                    <span className="text-sm text-gray-800 font-medium">{p.name}</span>
                    <span className="ml-2 text-xs text-gray-400">{p.role}</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(p.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Start button */}
        <button
          onClick={startSession}
          disabled={engineerCount === 0}
          className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {engineerCount === 0
            ? 'Waiting for at least one engineer…'
            : `Start session (${engineerCount} joined)`}
        </button>
      </div>
    </div>
  );
}
