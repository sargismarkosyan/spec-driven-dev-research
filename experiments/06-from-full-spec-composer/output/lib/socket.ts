'use client';

import { io, Socket } from 'socket.io-client';
import type { Activity, Participant, SerializedSession } from '@/lib/domain/types';
import type { Energy, Freq, Role, SessionStatus, TeamAuto, Tpo } from '@/lib/domain/enums';

export type JoinSessionPayload = {
  sessionId: string;
  name: string;
  role?: Role | string;
  isFacilitator?: boolean;
  token?: string;
};

export type ActivityAddPayload = {
  sessionId: string;
  title: string;
  tpo: Tpo | string;
  freq: Freq | string;
  energy: Energy | string;
};

export type ActivityUpdatePayload = {
  sessionId: string;
  activityId: string;
  title?: string;
  tpo?: Tpo | string;
  freq?: Freq | string;
  energy?: Energy | string;
  token?: string;
};

export type ActivityDeletePayload = {
  sessionId: string;
  activityId: string;
  token?: string;
};

export type SessionStartPayload = {
  sessionId: string;
  token: string;
};

export type SessionExtendPayload = {
  sessionId: string;
  token: string;
  addMinutes?: number;
};

export type SessionClosePayload = {
  sessionId: string;
  token: string;
};

export type SessionCompletePayload = {
  sessionId: string;
  token: string;
};

export type ActivityClassifyPayload = {
  sessionId: string;
  activityId: string;
  verdict: TeamAuto | 'yes' | 'maybe' | 'no';
  token: string;
};

export type ActivityFlagPayload = {
  sessionId: string;
  activityId: string;
  token: string;
  flagged?: boolean;
  note?: string;
};

export type ActivityNotePayload = {
  sessionId: string;
  activityId: string;
  token: string;
  note: string;
};

export type ActivityMergePayload = {
  sessionId: string;
  token: string;
  sourceIds: string[];
  title?: string;
  tpo: Tpo | string;
  freq: Freq | string;
  energy: Energy | string;
};

export type ActivityRelatePayload = {
  sessionId: string;
  token: string;
  activityId: string;
  relatedId: string;
};

export type ActivityDeletedPayload = { id: string };
export type ParticipantLeftPayload = { id: string };
export type SessionStatusPayload = { status: SessionStatus; startedAt?: string };
export type SessionExtendedPayload = { submissionWindowMin: number };
export type SessionSettingsPayload = {
  submissionWindowMin: number;
  liveTeamFeed: boolean;
  enabledCategories: string[];
  recallPrompts: string[];
};
export type ActivityMergedPayload = {
  newActivity: Activity;
  updatedSources: Activity[];
};

export interface ClientToServerEvents {
  'join-session': (payload: JoinSessionPayload) => void;
  'activity:add': (payload: ActivityAddPayload) => void;
  'activity:update': (payload: ActivityUpdatePayload) => void;
  'activity:delete': (payload: ActivityDeletePayload) => void;
  'session:start': (payload: SessionStartPayload) => void;
  'session:extend': (payload: SessionExtendPayload) => void;
  'session:close': (payload: SessionClosePayload) => void;
  'session:complete': (payload: SessionCompletePayload) => void;
  'activity:classify': (payload: ActivityClassifyPayload) => void;
  'activity:flag': (payload: ActivityFlagPayload) => void;
  'activity:note': (payload: ActivityNotePayload) => void;
  'activity:merge': (payload: ActivityMergePayload) => void;
  'activity:relate': (payload: ActivityRelatePayload) => void;
}

export interface ServerToClientEvents {
  'session:state': (state: SerializedSession) => void;
  'activity:added': (activity: Activity) => void;
  'activity:updated': (activity: Activity) => void;
  'activity:deleted': (payload: ActivityDeletedPayload) => void;
  'activity:merged': (payload: ActivityMergedPayload) => void;
  'participant:joined': (participant: Participant) => void;
  'participant:left': (payload: ParticipantLeftPayload) => void;
  'session:status': (payload: SessionStatusPayload) => void;
  'session:extended': (payload: SessionExtendedPayload) => void;
  'session:settings': (payload: SessionSettingsPayload) => void;
  error: (message: string) => void;
}

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
export type SessionState = SerializedSession;

let socket: AppSocket | null = null;

export function getSocket(): AppSocket {
  if (!socket) {
    socket = io({ autoConnect: false }) as AppSocket;
  }
  return socket;
}

function ensureConnected() {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function joinSession(params: JoinSessionPayload) {
  ensureConnected().emit('join-session', params);
}

export function emitJoinSession(payload: JoinSessionPayload) {
  ensureConnected().emit('join-session', payload);
}

export function emitActivityAdd(payload: ActivityAddPayload) {
  ensureConnected().emit('activity:add', payload);
}

export function emitActivityUpdate(payload: ActivityUpdatePayload) {
  ensureConnected().emit('activity:update', payload);
}

export function emitActivityDelete(payload: ActivityDeletePayload) {
  ensureConnected().emit('activity:delete', payload);
}

export function emitSessionStart(payload: SessionStartPayload) {
  ensureConnected().emit('session:start', payload);
}

export function emitSessionExtend(payload: SessionExtendPayload) {
  ensureConnected().emit('session:extend', payload);
}

export function emitSessionClose(payload: SessionClosePayload) {
  ensureConnected().emit('session:close', payload);
}

export function emitSessionComplete(payload: SessionCompletePayload) {
  ensureConnected().emit('session:complete', payload);
}

export function emitActivityClassify(payload: ActivityClassifyPayload) {
  ensureConnected().emit('activity:classify', payload);
}

export function emitActivityFlag(payload: ActivityFlagPayload) {
  ensureConnected().emit('activity:flag', payload);
}

export function emitActivityNote(payload: ActivityNotePayload) {
  ensureConnected().emit('activity:note', payload);
}

export function emitActivityMerge(payload: ActivityMergePayload) {
  ensureConnected().emit('activity:merge', payload);
}

export function emitActivityRelate(payload: ActivityRelatePayload) {
  ensureConnected().emit('activity:relate', payload);
}

export function disconnectSocket() {
  if (socket?.connected) socket.disconnect();
}
