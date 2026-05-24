import type { Activity } from './types';

export const SUGGESTION_DEDUP_KEY_LENGTH = 30;
export const SUGGESTION_EXCLUSION_KEY_LENGTH = 20;
export const MAX_SUGGESTIONS = 4;

export function suggestionKey(title: string, length: number): string {
  return title.toLowerCase().trim().slice(0, length);
}

export function firstNameFromDisplayName(name: string): string {
  return name.split(/\s+/)[0] ?? name;
}

export type Suggestion = {
  title: string;
  count: number;
  firstName: string;
};

export function computeSuggestions(
  teamFeed: Activity[],
  ownActivities: Activity[],
): Suggestion[] {
  const ownPrefixes = new Set(
    ownActivities.map((a) => suggestionKey(a.title, SUGGESTION_EXCLUSION_KEY_LENGTH)),
  );

  const groups = new Map<string, { title: string; count: number; firstName: string }>();

  for (const activity of teamFeed) {
    const key = suggestionKey(activity.title, SUGGESTION_DEDUP_KEY_LENGTH);
    if (ownPrefixes.has(suggestionKey(activity.title, SUGGESTION_EXCLUSION_KEY_LENGTH))) {
      continue;
    }
    const existing = groups.get(key);
    if (existing) {
      existing.count++;
    } else {
      groups.set(key, {
        title: activity.title,
        count: 1,
        firstName: firstNameFromDisplayName(activity.participantName),
      });
    }
  }

  return Array.from(groups.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_SUGGESTIONS);
}
