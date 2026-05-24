'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import type { SessionState } from '@/lib/socket';
import type { Activity, Participant } from '@/lib/domain/types';
import { useSocket } from '@/hooks/useSocket';

type SessionContextValue = {
  session: SessionState | null;
  loading: boolean;
  joinError: string | null;
  participantId: string | null;
  isFacilitator: boolean;
  token: string | null;
  refresh: () => Promise<void>;
  retryJoin: () => void;
};

const SessionContext = createContext<SessionContextValue>({
  session: null,
  loading: true,
  joinError: null,
  participantId: null,
  isFacilitator: false,
  token: null,
  refresh: async () => {},
  retryJoin: () => {},
});

export function SessionConnectionFallback({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      className="wa-screen"
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        textAlign: 'center',
      }}
    >
      <p style={{ color: 'var(--rust)', fontSize: 14, marginBottom: 12 }}>{message}</p>
      {onRetry && (
        <button type="button" className="wa-btn is-ghost" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function SessionProvider({
  sessionId,
  children,
  joinParams,
}: {
  sessionId: string;
  children: ReactNode;
  joinParams?: {
    name: string;
    role?: string;
    isFacilitator?: boolean;
    token?: string;
  };
}) {
  const [session, setSession] = useState<SessionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [joinAttempt, setJoinAttempt] = useState(0);
  const { socket, on, off, joinSession } = useSocket();

  const joinKey = joinParams
    ? `${joinParams.name}|${joinParams.role ?? ''}|${joinParams.isFacilitator ?? false}|${joinParams.token ?? ''}`
    : null;
  const stableJoinParams = useMemo(
    () => joinParams,
    // joinParams identity from parents is unstable; key captures meaningful join inputs
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessionId, joinKey],
  );

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/sessions/${sessionId}`);
    if (res.ok) {
      setSession(await res.json());
      setJoinError(null);
    } else if (res.status === 404) {
      setJoinError('Session not found');
    } else {
      setJoinError('Could not load session');
    }
    setLoading(false);
  }, [sessionId]);

  const retryJoin = useCallback(() => {
    setJoinError(null);
    setLoading(true);
    if (stableJoinParams) {
      setJoinAttempt((n) => n + 1);
    } else {
      void refresh();
    }
  }, [stableJoinParams, refresh]);

  useEffect(() => {
    let joinTimer: ReturnType<typeof setTimeout> | undefined;
    let connectHandler: (() => void) | undefined;

    const clearJoinTimer = () => {
      if (joinTimer !== undefined) {
        clearTimeout(joinTimer);
        joinTimer = undefined;
      }
    };

    const onState = (state: SessionState) => {
      clearJoinTimer();
      setSession(state);
      setParticipantId(socket.id ?? null);
      setJoinError(null);
      setLoading(false);
    };

    const onActivityAdded = (a: Activity) => {
      setSession((s) => {
        if (!s) return s;
        if (s.activities.some((x) => x.id === a.id)) return s;
        return { ...s, activities: [...s.activities, a] };
      });
    };
    const onActivityUpdated = (a: Activity) => {
      setSession((s) =>
        s ? { ...s, activities: s.activities.map((x) => (x.id === a.id ? a : x)) } : s,
      );
    };
    const onActivityDeleted = ({ id }: { id: string }) => {
      setSession((s) =>
        s ? { ...s, activities: s.activities.filter((x) => x.id !== id) } : s,
      );
    };
    const onActivityMerged = ({
      newActivity,
      updatedSources,
    }: {
      newActivity: Activity;
      updatedSources: Activity[];
    }) => {
      setSession((s) => {
        if (!s) return s;
        const map = new Map(s.activities.map((a) => [a.id, a]));
        updatedSources.forEach((src) => map.set(src.id, src));
        map.set(newActivity.id, newActivity);
        return { ...s, activities: Array.from(map.values()) };
      });
    };
    const onParticipantJoined = (p: Participant) => {
      setSession((s) =>
        s ? { ...s, participants: [...s.participants.filter((x) => x.id !== p.id), p] } : s,
      );
    };
    const onParticipantLeft = ({ id }: { id: string }) => {
      setSession((s) =>
        s ? { ...s, participants: s.participants.filter((x) => x.id !== id) } : s,
      );
    };
    const onStatus = (payload: { status: SessionState['status']; startedAt?: string }) => {
      setSession((s) =>
        s ? { ...s, status: payload.status, startedAt: payload.startedAt ?? s.startedAt } : s,
      );
    };
    const onExtended = ({ submissionWindowMin }: { submissionWindowMin: number }) => {
      setSession((s) => (s ? { ...s, submissionWindowMin } : s));
    };
    const onSettings = (payload: {
      submissionWindowMin: number;
      liveTeamFeed: boolean;
      enabledCategories: string[];
      recallPrompts: string[];
    }) => {
      setSession((s) => (s ? { ...s, ...payload } : s));
    };
    const onSocketError = (message: string) => {
      clearJoinTimer();
      setJoinError(message);
      setLoading(false);
    };

    on('session:state', onState);
    on('activity:added', onActivityAdded);
    on('activity:updated', onActivityUpdated);
    on('activity:deleted', onActivityDeleted);
    on('activity:merged', onActivityMerged);
    on('participant:joined', onParticipantJoined);
    on('participant:left', onParticipantLeft);
    on('session:status', onStatus);
    on('session:extended', onExtended);
    on('session:settings', onSettings);
    on('error', onSocketError);

    const startJoinTimeout = () => {
      clearJoinTimer();
      joinTimer = setTimeout(() => {
        setJoinError((prev) => prev ?? 'Connection timed out — could not join session');
        setLoading(false);
      }, 12000);
    };

    const emitJoin = () => {
      if (!stableJoinParams) return;
      joinSession({ sessionId, ...stableJoinParams });
      startJoinTimeout();
    };

    if (stableJoinParams) {
      if (socket.connected) {
        emitJoin();
      } else {
        connectHandler = () => {
          if (connectHandler) socket.off('connect', connectHandler);
          emitJoin();
        };
        socket.on('connect', connectHandler);
        if (!socket.connected) socket.connect();
      }
    } else {
      void refresh();
    }

    return () => {
      clearJoinTimer();
      if (connectHandler) socket.off('connect', connectHandler);
      off('session:state', onState);
      off('activity:added', onActivityAdded);
      off('activity:updated', onActivityUpdated);
      off('activity:deleted', onActivityDeleted);
      off('activity:merged', onActivityMerged);
      off('participant:joined', onParticipantJoined);
      off('participant:left', onParticipantLeft);
      off('session:status', onStatus);
      off('session:extended', onExtended);
      off('session:settings', onSettings);
      off('error', onSocketError);
    };
  }, [sessionId, stableJoinParams, joinAttempt, refresh, socket, on, off, joinSession]);

  return (
    <SessionContext.Provider
      value={{
        session,
        loading,
        joinError,
        participantId,
        isFacilitator: !!stableJoinParams?.isFacilitator,
        token: stableJoinParams?.token ?? null,
        refresh,
        retryJoin,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSessionContext() {
  return useContext(SessionContext);
}
