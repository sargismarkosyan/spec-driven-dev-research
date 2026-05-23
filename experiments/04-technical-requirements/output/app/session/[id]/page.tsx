'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { socket } from '@/lib/socket';
import type { Session, Participant, Activity } from '@/lib/types';
import EngineerView from './engineer';
import FacilitatorView from './facilitator';

export default function SessionPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = params.id as string;
  const token = searchParams.get('token') ?? undefined;

  const [session, setSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSession = useCallback(async () => {
    const res = await fetch(`/api/sessions/${sessionId}`);
    if (!res.ok) { setError('Session not found.'); setLoading(false); return; }
    const data = await res.json();
    setSession(data.session);
    setParticipants(data.participants);
    setActivities(data.activities);
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    fetchSession();

    socket.connect();
    socket.emit('join:session', sessionId);

    socket.on('participant:joined', ({ participant }: { participant: Participant }) => {
      setParticipants((prev) => [...prev.filter((p) => p.id !== participant.id), participant]);
    });
    socket.on('activity:added', ({ activity }: { activity: Activity }) => {
      setActivities((prev) => [...prev.filter((a) => a.id !== activity.id), activity]);
    });
    socket.on('activity:updated', ({ activity }: { activity: Activity }) => {
      setActivities((prev) => prev.map((a) => (a.id === activity.id ? activity : a)));
    });
    socket.on('activity:removed', ({ activityId }: { activityId: string }) => {
      setActivities((prev) => prev.filter((a) => a.id !== activityId));
    });
    socket.on('activity:merged', ({ merged, removedIds }: { merged: Activity; removedIds: string[] }) => {
      setActivities((prev) => [
        ...prev.filter((a) => !removedIds.includes(a.id)),
        merged,
      ]);
    });
    socket.on('activity:classified', ({ activityId, teamAuto }: { activityId: string; teamAuto: Activity['teamAuto'] }) => {
      setActivities((prev) =>
        prev.map((a) => (a.id === activityId ? { ...a, teamAuto } : a))
      );
    });
    socket.on('activity:flagged', ({ activityId, flagged }: { activityId: string; flagged: boolean }) => {
      setActivities((prev) =>
        prev.map((a) => (a.id === activityId ? { ...a, flaggedByFacilitator: flagged } : a))
      );
    });
    socket.on('session:statusChanged', ({ status }: { status: Session['status'] }) => {
      setSession((prev) => prev ? { ...prev, status } : prev);
    });
    socket.on('session:windowUpdated', ({ submissionEndsAt }: { submissionEndsAt: string | null }) => {
      setSession((prev) => prev ? { ...prev, submissionEndsAt } : prev);
    });

    return () => {
      socket.off('participant:joined');
      socket.off('activity:added');
      socket.off('activity:updated');
      socket.off('activity:removed');
      socket.off('activity:merged');
      socket.off('activity:classified');
      socket.off('activity:flagged');
      socket.off('session:statusChanged');
      socket.off('session:windowUpdated');
      socket.disconnect();
    };
  }, [sessionId, fetchSession]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading session…
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-800 font-medium">{error ?? 'Session not found.'}</p>
          <a href="/" className="mt-3 text-sm text-blue-600 hover:underline block">
            ← Back to home
          </a>
        </div>
      </div>
    );
  }

  if (token) {
    return (
      <FacilitatorView
        session={session}
        participants={participants}
        activities={activities}
        token={token}
        sessionId={sessionId}
        onSessionUpdate={setSession}
        onActivitiesUpdate={setActivities}
      />
    );
  }

  return (
    <EngineerView
      session={session}
      participants={participants}
      activities={activities}
      sessionId={sessionId}
    />
  );
}
