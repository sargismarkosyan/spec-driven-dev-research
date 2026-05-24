'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getSocket,
  joinSession,
  type AppSocket,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from '@/lib/socket';

type UseSocketOptions = {
  autoConnect?: boolean;
};

export function useSocket(options: UseSocketOptions = {}) {
  const { autoConnect = true } = options;
  const [connected, setConnected] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);

  useEffect(() => {
    const socket = getSocket();
    if (autoConnect && !socket.connected) socket.connect();

    const onConnect = () => {
      setConnected(true);
      setConnectError(null);
    };
    const onDisconnect = () => setConnected(false);
    const onError = (message: string) => {
      console.error('[socket]', message);
      setLastError(message);
    };
    const onConnectError = (err: Error) => {
      console.error('[socket] connect_error', err.message);
      setConnectError(err.message);
    };

    setConnected(socket.connected);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('error', onError);
    socket.on('connect_error', onConnectError);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('error', onError);
      socket.off('connect_error', onConnectError);
    };
  }, [autoConnect]);

  const emit = useCallback(
    <E extends keyof ClientToServerEvents>(
      event: E,
      ...args: Parameters<ClientToServerEvents[E]>
    ) => {
      const socket = getSocket();
      if (!socket.connected) socket.connect();
      (socket.emit as (ev: E, ...payload: Parameters<ClientToServerEvents[E]>) => void)(
        event,
        ...args,
      );
    },
    [],
  );

  const on = useCallback(
    <E extends keyof ServerToClientEvents>(event: E, handler: ServerToClientEvents[E]) => {
      getSocket().on(event as never, handler as never);
    },
    [],
  );

  const off = useCallback(
    <E extends keyof ServerToClientEvents>(
      event: E,
      handler?: ServerToClientEvents[E],
    ) => {
      if (handler) getSocket().off(event as never, handler as never);
      else getSocket().off(event as never);
    },
    [],
  );

  const clearError = useCallback(() => setLastError(null), []);
  const clearConnectError = useCallback(() => setConnectError(null), []);

  return {
    socket: getSocket() as AppSocket,
    connected,
    lastError,
    connectError,
    emit,
    on,
    off,
    joinSession,
    clearError,
    clearConnectError,
  };
}
