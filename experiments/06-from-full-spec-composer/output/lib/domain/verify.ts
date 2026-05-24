/**
 * Domain verification script — run with: npx tsx lib/domain/verify.ts
 */
import { effortHoursPerWeek, formatEffort, matrixY, perceivedCost } from './calculations';
import { mergeSimilarity, MERGE_SIMILARITY_THRESHOLD } from './merge';
import { createSession, getSession } from '../../src/store';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ ${message}`);
  }
}

console.log('Domain verification\n');

console.log('Calculations:');
assert(effortHoursPerWeek('30m-2h', 'weekly') === 1.25, 'effort 30m-2h + weekly = 1.25');
assert(formatEffort(1.25) === '~1 h/wk', 'formatEffort(1.25) = ~1 h/wk');
assert(matrixY('draining') === 12, 'matrixY draining = 12%');
assert(perceivedCost('half-day', 'weekly', 'draining') === 8.0, 'perceived cost half-day weekly draining = 8.0');

console.log('\nMerge similarity:');
const score = mergeSimilarity(
  { title: 'Triage Sentry alerts', tpo: '<30m', freq: 'daily' },
  { title: 'Triage sentry alert queue', tpo: '<30m', freq: 'daily' },
);
assert(score >= MERGE_SIMILARITY_THRESHOLD, 'similar titles score >= 0.15 threshold');

console.log('\nStore:');
const session = createSession({ name: 'Platform team · Q2 audit' });
assert(session.submissionWindowMin === 10, 'default submission window = 10 min');
assert(session.liveTeamFeed === true, 'default liveTeamFeed = true');
assert(session.enabledCategories.length === 9, 'all 9 categories enabled by default');
assert(session.status === 'lobby', 'initial status = lobby');
assert(getSession(session.id) !== undefined, 'session retrievable from store');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
