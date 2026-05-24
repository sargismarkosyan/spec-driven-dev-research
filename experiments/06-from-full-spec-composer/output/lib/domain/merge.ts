import type { Activity } from './types';

export function tokenizeTitle(title: string): Set<string> {
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2);
  return new Set(words);
}

export function jaccardSimilarity(a: string, b: string): number {
  const setA = tokenizeTitle(a);
  const setB = tokenizeTitle(b);
  if (setA.size === 0 && setB.size === 0) return 0;
  let intersection = 0;
  for (const word of setA) {
    if (setB.has(word)) intersection++;
  }
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

export function mergeSimilarity(
  source: Pick<Activity, 'title' | 'tpo' | 'freq'>,
  candidate: Pick<Activity, 'title' | 'tpo' | 'freq'>,
): number {
  const titleSimilarity = jaccardSimilarity(source.title, candidate.title);
  const sameFreq = source.freq === candidate.freq ? 1 : 0;
  const sameTpo = source.tpo === candidate.tpo ? 1 : 0;
  return 0.85 * titleSimilarity + 0.1 * sameFreq + 0.05 * sameTpo;
}

export const MERGE_SIMILARITY_THRESHOLD = 0.15;
export const MERGE_CANDIDATE_MAX = 5;

export type MergeCandidate = {
  activity: Activity;
  score: number;
};

export function findMergeCandidates(
  source: Activity,
  activities: Activity[],
  excludeIds: string[] = [],
): MergeCandidate[] {
  const exclude = new Set([source.id, ...excludeIds]);
  return activities
    .filter((a) => !exclude.has(a.id) && !a.isMergedSource)
    .map((activity) => ({ activity, score: mergeSimilarity(source, activity) }))
    .filter(({ score }) => score >= MERGE_SIMILARITY_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, MERGE_CANDIDATE_MAX);
}

export function similarityBadgeClass(score: number): 'is-rust' | 'is-amber' | null {
  if (score <= MERGE_SIMILARITY_THRESHOLD) return null;
  if (score > 0.6) return 'is-rust';
  if (score > 0.3) return 'is-amber';
  return null;
}
