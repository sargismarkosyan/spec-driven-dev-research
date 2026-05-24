'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export function useTimer(startedAt: string | undefined, submissionWindowMin: number) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [expired, setExpired] = useState(false);
  const windowMinRef = useRef(submissionWindowMin);
  const startedAtRef = useRef(startedAt);

  useEffect(() => {
    windowMinRef.current = submissionWindowMin;
  }, [submissionWindowMin]);

  useEffect(() => {
    startedAtRef.current = startedAt;
  }, [startedAt]);

  const tick = useCallback(() => {
    const sa = startedAtRef.current;
    if (!sa || windowMinRef.current <= 0) {
      setRemaining(null);
      setExpired(false);
      return;
    }

    const endMs = new Date(sa).getTime() + windowMinRef.current * 60 * 1000;
    const rem = Math.floor((endMs - Date.now()) / 1000);
    if (rem <= 0) {
      setRemaining(0);
      setExpired(true);
    } else {
      setRemaining(rem);
      setExpired(false);
    }
  }, []);

  useEffect(() => {
    if (!startedAt || submissionWindowMin <= 0) {
      setRemaining(null);
      setExpired(false);
      return;
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt, submissionWindowMin, tick]);

  const urgent = remaining !== null && remaining < 120 && !expired;

  const display =
    remaining === null
      ? null
      : expired
        ? 'Time up'
        : `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;

  const snapExtend = (addMinutes: number) => {
    if (!startedAtRef.current) return;
    const elapsedMin = (Date.now() - new Date(startedAtRef.current).getTime()) / 60000;
    if (windowMinRef.current > elapsedMin) {
      windowMinRef.current += addMinutes;
    } else {
      windowMinRef.current = Math.ceil(elapsedMin) + addMinutes;
    }
    tick();
  };

  return { remaining, expired, urgent, display, snapExtend, windowMinRef };
}
