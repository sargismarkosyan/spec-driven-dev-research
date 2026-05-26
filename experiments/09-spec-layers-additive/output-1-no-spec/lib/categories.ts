// Work Audit — prompt categories shown to engineers during submission.
// Facilitator picks which categories to show at session creation (all on by default).

export type TimePerOccurrence = '<30m' | '30m-2h' | 'half-day' | 'day+';
export type Frequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'adhoc';

export type PromptExample = {
  title: string;
  tpo: TimePerOccurrence;
  freq: Frequency;
};

export type PromptCategory = {
  id: string;
  label: string;
  examples: PromptExample[];
};

export const PROMPT_CATEGORIES: PromptCategory[] = [
  {
    id: 'yesterday',
    label: 'Yesterday & this week',
    examples: [
      { title: 'Reviewing pull requests',       tpo: '30m-2h', freq: 'daily'   },
      { title: 'Updating tickets / Jira tasks', tpo: '<30m',   freq: 'daily'   },
      { title: 'Code review feedback rounds',   tpo: '30m-2h', freq: 'weekly'  },
      { title: 'Writing up what I worked on',   tpo: '<30m',   freq: 'weekly'  },
    ],
  },
  {
    id: 'weekly-meetings',
    label: 'Weekly meetings',
    examples: [
      { title: 'Team sync / standup',          tpo: '<30m',   freq: 'daily'   },
      { title: '1:1 with manager',             tpo: '<30m',   freq: 'weekly'  },
      { title: 'Sprint planning / grooming',   tpo: '30m-2h', freq: 'weekly'  },
      { title: 'Architecture or design review',tpo: '30m-2h', freq: 'monthly' },
    ],
  },
  {
    id: 'monthly-rituals',
    label: 'Monthly rituals',
    examples: [
      { title: 'Postmortem / retro writing',  tpo: '30m-2h', freq: 'monthly' },
      { title: 'Monthly reporting or metrics',tpo: '30m-2h', freq: 'monthly' },
      { title: 'Access & permission reviews', tpo: '<30m',   freq: 'monthly' },
      { title: 'Team health check',           tpo: '<30m',   freq: 'monthly' },
    ],
  },
  {
    id: 'oncall',
    label: 'On-call & incidents',
    examples: [
      { title: 'Alert triage (Sentry, PagerDuty…)', tpo: '<30m',   freq: 'daily'  },
      { title: 'Incident write-ups',                tpo: '30m-2h', freq: 'adhoc'  },
      { title: 'Runbook / playbook updates',        tpo: '30m-2h', freq: 'adhoc'  },
      { title: 'Post-incident review meetings',     tpo: '<30m',   freq: 'adhoc'  },
    ],
  },
  {
    id: 'quarterly',
    label: 'Quarterly cycles',
    examples: [
      { title: 'OKR / goal planning',      tpo: '30m-2h',  freq: 'quarterly' },
      { title: 'Performance reviews',      tpo: 'half-day', freq: 'quarterly' },
      { title: 'Quarterly roadmap prep',   tpo: '30m-2h',  freq: 'quarterly' },
      { title: 'Capacity planning',        tpo: '30m-2h',  freq: 'quarterly' },
    ],
  },
  {
    id: 'manual-chores',
    label: 'Manual chores',
    examples: [
      { title: 'Manual deploys / release steps',      tpo: '<30m', freq: 'weekly' },
      { title: 'Manual DB backups',                   tpo: '<30m', freq: 'weekly' },
      { title: 'SSL / cert renewals',                 tpo: '<30m', freq: 'adhoc'  },
      { title: 'Promoting feature flags between envs',tpo: '<30m', freq: 'adhoc'  },
    ],
  },
  {
    id: 'handoffs',
    label: 'Handoffs & coordination',
    examples: [
      { title: 'Drafting release notes',      tpo: '<30m',   freq: 'monthly' },
      { title: 'Stakeholder status updates',  tpo: '<30m',   freq: 'weekly'  },
      { title: 'Cross-team syncs',            tpo: '<30m',   freq: 'weekly'  },
      { title: 'Escalating support tickets',  tpo: '<30m',   freq: 'adhoc'   },
    ],
  },
  {
    id: 'automate',
    label: 'Things I wish we automated',
    examples: [
      { title: 'Repetitive test setup / teardown', tpo: '<30m',   freq: 'daily'   },
      { title: 'Generating boilerplate code',      tpo: '<30m',   freq: 'weekly'  },
      { title: 'Manual data migrations',           tpo: '30m-2h', freq: 'adhoc'   },
      { title: 'Report or changelog generation',   tpo: '<30m',   freq: 'monthly' },
    ],
  },
  {
    id: 'other',
    label: 'Other recurring work',
    examples: [
      { title: 'Admin / expense reports',                   tpo: '<30m', freq: 'monthly'   },
      { title: 'Compliance tasks',                          tpo: '<30m', freq: 'quarterly' },
      { title: 'Documentation upkeep',                      tpo: '<30m', freq: 'weekly'    },
      { title: 'Slack DM triage of "quick questions"',      tpo: '<30m', freq: 'daily'     },
    ],
  },
];

export const ALL_CATEGORY_IDS = PROMPT_CATEGORIES.map(c => c.id);
