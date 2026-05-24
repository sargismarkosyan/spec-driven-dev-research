'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { emitActivityDelete } from '@/lib/socket';

const SOFT_DELETE_MS = 5000;

export function useSoftDelete(sessionId: string) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pendingTitle, setPendingTitle] = useState<string | null>(null);
  const [drainProgress, setDrainProgress] = useState(100);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearPending = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timerRef.current = null;
    intervalRef.current = null;
    setPendingId(null);
    setPendingTitle(null);
    setDrainProgress(100);
  }, []);

  const commitDelete = useCallback(
    (activityId: string) => {
      emitActivityDelete({ sessionId, activityId });
    },
    [sessionId],
  );

  const softDelete = useCallback(
    (activityId: string, title: string) => {
      if (pendingId && pendingId !== activityId) {
        commitDelete(pendingId);
        clearPending();
      }

      setPendingId(activityId);
      setPendingTitle(title);
      setDrainProgress(100);
      const start = Date.now();

      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - start;
        setDrainProgress(Math.max(0, 100 - (elapsed / SOFT_DELETE_MS) * 100));
      }, 50);

      timerRef.current = setTimeout(() => {
        commitDelete(activityId);
        clearPending();
      }, SOFT_DELETE_MS);
    },
    [pendingId, commitDelete, clearPending],
  );

  const undo = useCallback(() => {
    clearPending();
  }, [clearPending]);

  useEffect(() => () => clearPending(), [clearPending]);

  return { pendingId, pendingTitle, drainProgress, softDelete, undo };
}
