import type { Freq, Tpo } from './enums';

export const AVATAR_COLORS = [
  '#C45C3E',
  '#4A7C59',
  '#3D5A80',
  '#B8860B',
  '#7B4B94',
  '#2E86AB',
  '#A0522D',
  '#556B2F',
] as const;

export const ALL_CATEGORY_IDS = [
  'yesterday',
  'weekly-meetings',
  'monthly-rituals',
  'oncall',
  'quarterly',
  'manual-chores',
  'handoffs',
  'automate',
  'other',
] as const;

export type CategoryId = (typeof ALL_CATEGORY_IDS)[number];

export const CATEGORY_DISPLAY_NAMES: Record<CategoryId, string> = {
  yesterday: 'Yesterday & this week',
  'weekly-meetings': 'Weekly meetings',
  'monthly-rituals': 'Monthly rituals',
  oncall: 'On-call & incidents',
  quarterly: 'Quarterly cycles',
  'manual-chores': 'Manual chores',
  handoffs: 'Handoffs & coordination',
  automate: 'Things I wish we automated',
  other: 'Other recurring work',
};

export type PromptExample = {
  title: string;
  tpo?: Tpo;
  freq?: Freq;
};

export const CATEGORY_EXAMPLES: Record<CategoryId, PromptExample[]> = {
  yesterday: [
    { title: 'Triage Sentry alerts each morning', tpo: '<30m', freq: 'daily' },
    { title: 'Review overnight PR queue', tpo: '<30m', freq: 'daily' },
    { title: 'Update sprint board after standup', tpo: '<30m', freq: 'daily' },
  ],
  'weekly-meetings': [
    { title: 'Run team standup', tpo: '<30m', freq: 'weekly' },
    { title: 'Prepare sprint planning deck', tpo: '30m-2h', freq: 'weekly' },
    { title: 'Attend cross-team sync', tpo: '30m-2h', freq: 'weekly' },
  ],
  'monthly-rituals': [
    { title: 'Write monthly engineering update', tpo: '30m-2h', freq: 'monthly' },
    { title: 'Review on-call rotation schedule', tpo: '<30m', freq: 'monthly' },
    { title: 'Facilitate retro action-item review', tpo: '30m-2h', freq: 'monthly' },
  ],
  oncall: [
    { title: 'Respond to production pages', tpo: '30m-2h', freq: 'adhoc' },
    { title: 'Write incident postmortem', tpo: 'half-day', freq: 'adhoc' },
    { title: 'Rotate on-call handoff notes', tpo: '<30m', freq: 'weekly' },
  ],
  quarterly: [
    { title: 'Prepare OKR progress report', tpo: 'half-day', freq: 'quarterly' },
    { title: 'Run architecture review cycle', tpo: '30m-2h', freq: 'quarterly' },
    { title: 'Audit dependency upgrades', tpo: '30m-2h', freq: 'quarterly' },
  ],
  'manual-chores': [
    { title: 'Manually rotate API keys', tpo: '<30m', freq: 'monthly' },
    { title: 'Clean up stale feature flags', tpo: '30m-2h', freq: 'monthly' },
    { title: 'Export metrics to spreadsheet', tpo: '<30m', freq: 'weekly' },
  ],
  handoffs: [
    { title: 'Sync with design on in-flight work', tpo: '30m-2h', freq: 'weekly' },
    { title: 'Write release notes for deploy', tpo: '<30m', freq: 'weekly' },
    { title: 'Coordinate with support on escalations', tpo: '<30m', freq: 'adhoc' },
  ],
  automate: [
    { title: 'Wish we auto-generated test data', tpo: '30m-2h', freq: 'weekly' },
    { title: 'Wish deploy approvals were automated', tpo: '<30m', freq: 'weekly' },
    { title: 'Wish incident runbooks self-updated', tpo: '<30m', freq: 'adhoc' },
  ],
  other: [
    { title: 'Mentor new team member', tpo: '30m-2h', freq: 'weekly' },
    { title: 'Review security audit findings', tpo: 'half-day', freq: 'quarterly' },
    { title: 'Update team documentation', tpo: '30m-2h', freq: 'monthly' },
  ],
};


export const SESSION_ID_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';
export const SESSION_ID_LENGTH = 8;
