export type PromptExample = { title: string; tpo: string; freq: string };
export type PromptCategory = { id: string; label: string; examples: PromptExample[] };

export const PROMPT_CATEGORIES: PromptCategory[] = [
  {
    id: 'meetings',
    label: 'Meetings & syncs',
    examples: [
      { title: 'Weekly team standup', tpo: '<30m', freq: 'daily' },
      { title: 'Sprint planning', tpo: '30m-2h', freq: 'weekly' },
      { title: 'Quarterly planning', tpo: 'half-day', freq: 'quarterly' },
    ],
  },
  {
    id: 'on-call',
    label: 'On-call & incidents',
    examples: [
      { title: 'Responding to pages', tpo: '30m-2h', freq: 'weekly' },
      { title: 'Incident postmortems', tpo: '30m-2h', freq: 'monthly' },
      { title: 'Runbook updates after incident', tpo: '<30m', freq: 'monthly' },
    ],
  },
  {
    id: 'code-review',
    label: 'Code review',
    examples: [
      { title: 'Reviewing pull requests', tpo: '30m-2h', freq: 'daily' },
      { title: 'Addressing review comments', tpo: '<30m', freq: 'daily' },
      { title: 'Reviewing large migrations', tpo: 'half-day', freq: 'monthly' },
    ],
  },
  {
    id: 'deployments',
    label: 'Deployments & releases',
    examples: [
      { title: 'Deploying to production', tpo: '<30m', freq: 'weekly' },
      { title: 'Manual release coordination', tpo: '30m-2h', freq: 'weekly' },
      { title: 'Hotfix deployment', tpo: '30m-2h', freq: 'monthly' },
    ],
  },
  {
    id: 'data',
    label: 'Data & reporting',
    examples: [
      { title: 'Weekly metrics report', tpo: '<30m', freq: 'weekly' },
      { title: 'Data pipeline monitoring', tpo: '<30m', freq: 'daily' },
      { title: 'Ad-hoc data queries', tpo: '30m-2h', freq: 'adhoc' },
    ],
  },
  {
    id: 'support',
    label: 'Internal support',
    examples: [
      { title: 'Answering Slack questions', tpo: '30m-2h', freq: 'daily' },
      { title: 'Debugging production issues for other teams', tpo: '30m-2h', freq: 'weekly' },
      { title: 'Onboarding new engineers', tpo: 'half-day', freq: 'monthly' },
    ],
  },
  {
    id: 'toil',
    label: 'Toil & manual work',
    examples: [
      { title: 'Manual environment provisioning', tpo: '30m-2h', freq: 'weekly' },
      { title: 'Updating config files manually', tpo: '<30m', freq: 'weekly' },
      { title: 'Database migrations by hand', tpo: 'half-day', freq: 'monthly' },
    ],
  },
  {
    id: 'planning',
    label: 'Planning & docs',
    examples: [
      { title: 'Writing design docs', tpo: '30m-2h', freq: 'weekly' },
      { title: 'Updating runbooks', tpo: '<30m', freq: 'weekly' },
      { title: 'Roadmap planning sessions', tpo: 'half-day', freq: 'quarterly' },
    ],
  },
  {
    id: 'other',
    label: 'Other recurring work',
    examples: [
      { title: 'Dependency upgrades', tpo: '30m-2h', freq: 'monthly' },
      { title: 'Performance profiling', tpo: '30m-2h', freq: 'monthly' },
      { title: 'Security scanning', tpo: '<30m', freq: 'weekly' },
    ],
  },
];

export const DEFAULT_ENABLED_CATEGORIES = PROMPT_CATEGORIES.map(c => c.id);
