import type { Activity, Session } from '../domain/types';
import type { Energy, Freq, TeamAuto, Tpo } from '../domain/enums';
import {
  createActivity,
  deleteActivity,
  generateMergedActivityId,
  getSession,
} from '../../src/store';
import { findMergeCandidates, jaccardSimilarity } from '../domain/merge';
import { getVisibleActivities } from '../domain/serialization';
import { isValidEnergy, isValidFreq, isValidTeamAuto, isValidTpo } from '../domain/enums';

export function getActivity(session: Session, activityId: string): Activity | undefined {
  return session.activities.get(activityId);
}

export function addActivityToSession(
  session: Session,
  participantId: string,
  data: { title: string; tpo: Tpo; freq: Freq; energy: Energy },
  options?: { allowFacilitator?: boolean },
): Activity | null {
  if (session.status !== 'active') return null;
  const participant = session.participants.get(participantId);
  if (!participant || (!options?.allowFacilitator && participant.isFacilitator)) return null;
  if (!data.title?.trim()) return null;

  return createActivity({
    sessionId: session.id,
    participantId,
    participantName: participant.name,
    participantInitials: participant.initials,
    participantColor: participant.color,
    title: data.title,
    tpo: data.tpo,
    freq: data.freq,
    energy: data.energy,
  });
}

export function updateActivityFields(
  session: Session,
  activityId: string,
  updates: Partial<Pick<Activity, 'title' | 'tpo' | 'freq' | 'energy' | 'teamAuto' | 'flagged' | 'discussionNote'>>,
  who: string,
  what: string,
  setEditedBy?: string,
  skipHistory?: boolean,
): Activity | null {
  const activity = session.activities.get(activityId);
  if (!activity) return null;

  if (updates.title !== undefined) activity.title = updates.title.trim();
  if (updates.tpo !== undefined) activity.tpo = updates.tpo;
  if (updates.freq !== undefined) activity.freq = updates.freq;
  if (updates.energy !== undefined) activity.energy = updates.energy;
  if (updates.teamAuto !== undefined) activity.teamAuto = updates.teamAuto;
  if (updates.flagged !== undefined) activity.flagged = updates.flagged;
  if (updates.discussionNote !== undefined) activity.discussionNote = updates.discussionNote;

  if (setEditedBy) activity.editedBy = setEditedBy;
  if (!skipHistory) {
    activity.editHistory.push({ who, what, at: new Date().toISOString() });
  }
  return activity;
}

export function classifyActivity(
  session: Session,
  activityId: string,
  verdict: TeamAuto,
  facilitatorName: string,
  via: 'socket' | 'rest' = 'rest',
): Activity | null {
  const who = facilitatorName || 'Facilitator';
  const what =
    via === 'socket' ? `tagged → ${verdict}` : `tagged automatable → ${verdict}`;
  return updateActivityFields(session, activityId, { teamAuto: verdict }, who, what);
}

export function flagActivity(
  session: Session,
  activityId: string,
  flagged: boolean,
  note: string | undefined,
  facilitatorName: string,
): Activity | null {
  const updates: Partial<Activity> = { flagged };
  if (note !== undefined) updates.discussionNote = note;
  return updateActivityFields(
    session,
    activityId,
    updates,
    facilitatorName || 'Facilitator',
    flagged ? 'flagged' : 'unflagged',
  );
}

export function mergeActivities(
  session: Session,
  sourceIds: string[],
  data: { title?: string; tpo: Tpo; freq: Freq; energy: Energy },
): { newActivity: Activity; updatedSources: Activity[] } | null {
  if (sourceIds.length < 2) return null;

  const sources: Activity[] = [];
  for (const id of sourceIds) {
    const a = session.activities.get(id);
    if (!a || a.isMergedSource) return null;
    sources.push(a);
  }

  const primary = sources[0];
  const now = new Date().toISOString();
  const mergedId = generateMergedActivityId();

  const mergedFromNames = sources.map((s) => s.participantName);
  const mergedFromInitials = sources.map((s) => s.participantInitials);
  const mergedFromColors = sources.map((s) => s.participantColor);

  const reportedBySet = new Map<string, { initials: string; color: string }>();
  for (const s of sources) {
    reportedBySet.set(s.participantName, {
      initials: s.participantInitials,
      color: s.participantColor,
    });
  }

  const newActivity: Activity = {
    id: mergedId,
    sessionId: session.id,
    participantId: primary.participantId,
    participantName: primary.participantName,
    participantInitials: primary.participantInitials,
    participantColor: primary.participantColor,
    title: data.title?.trim() || primary.title,
    tpo: data.tpo,
    freq: data.freq,
    energy: data.energy,
    teamAuto: 'unclassified',
    flagged: false,
    discussionNote: '',
    createdAt: now,
    editHistory: [
      {
        who: 'Facilitator',
        what: `merged ${sources.length} activities`,
        at: now,
      },
    ],
    mergedFromIds: sourceIds,
    mergedFromNames,
    mergedFromInitials,
    mergedFromColors,
    reportedBy: Array.from(reportedBySet.keys()),
    reportedByInitials: Array.from(reportedBySet.values()).map((v) => v.initials),
    reportedByColors: Array.from(reportedBySet.values()).map((v) => v.color),
    relatedTo: [],
  };

  session.activities.set(mergedId, newActivity);

  const updatedSources: Activity[] = [];
  for (const source of sources) {
    source.isMergedSource = true;
    source.mergedIntoId = mergedId;
    updatedSources.push(source);
  }

  return { newActivity, updatedSources };
}

export function relateActivities(
  session: Session,
  activityId: string,
  relatedId: string,
): { a: Activity; b: Activity } | null {
  const a = session.activities.get(activityId);
  const b = session.activities.get(relatedId);
  if (!a || !b) return null;

  if (!a.relatedTo) a.relatedTo = [];
  if (!b.relatedTo) b.relatedTo = [];

  if (!a.relatedTo.includes(relatedId)) a.relatedTo.push(relatedId);
  if (!b.relatedTo.includes(activityId)) b.relatedTo.push(activityId);

  return { a, b };
}

export function getMergeCandidatesForApi(session: Session, activityId: string) {
  const source = session.activities.get(activityId);
  if (!source) return null;

  const candidates = findMergeCandidates(source, getVisibleActivities(session));
  return candidates.map(({ activity, score }) => ({
    ...activity,
    sem: Math.min(1, jaccardSimilarity(source.title, activity.title) * 1.3),
    sameFreq: source.freq === activity.freq,
    sameTpo: source.tpo === activity.tpo,
    similarity: score,
  }));
}

export function validateActivityDimensions(
  tpo: string,
  freq: string,
  energy: string,
): boolean {
  return isValidTpo(tpo) && isValidFreq(freq) && isValidEnergy(energy);
}

export { deleteActivity, getSession, isValidTeamAuto };
