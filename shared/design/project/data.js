// Shared sample data for the work audit screens
// REVISED MODEL (v2) per feedback:
//   - Time: concrete units (<30m, 30m-2h, half-day, day+)
//   - Frequency: concrete cadence (daily, weekly, monthly, quarterly, adhoc) — replaces "repetitive"
//   - Energy: energizing/neutral/draining — replaces "enjoy"
//   - Automatable: NOT engineer-submitted. Team-classifies during discussion. Stored as team_auto.

window.WA_TEAM = [
  { id: 'sa', name: 'Sarah Lim',    initials: 'SL', role: 'Senior eng', color: '#b14d2f' },
  { id: 'ma', name: 'Marco Reyes',  initials: 'MR', role: 'Eng',        color: '#6b7d5a' },
  { id: 'je', name: 'Jess Park',    initials: 'JP', role: 'Eng',        color: '#c8945f' },
  { id: 'pr', name: 'Priya Shah',   initials: 'PS', role: 'Tech lead',  color: '#5a7a8a' },
  { id: 'de', name: 'Devon Okafor', initials: 'DO', role: 'Manager',    color: '#7a5a8a' },
  { id: 'na', name: 'Nadia Voss',   initials: 'NV', role: 'Eng',        color: '#3a342c' },
];

// tpo:     '<30m' | '30m-2h' | 'half-day' | 'day+'
// freq:    'daily' | 'weekly' | 'monthly' | 'quarterly' | 'adhoc'
// energy:  'energizing' | 'neutral' | 'draining'
// team_auto: 'yes' | 'maybe' | 'no' | 'unclassified'   (set during discussion)
window.WA_ACTIVITIES = [
  { id: 'a01', who: 'sa', t: 'Triage Sentry alerts each morning',           tpo: '30m-2h',   freq: 'daily',     energy: 'draining',   team_auto: 'yes',   flagged: true  },
  { id: 'a02', who: 'sa', t: 'Review PRs from juniors',                     tpo: '30m-2h',   freq: 'daily',     energy: 'energizing', team_auto: 'no',    flagged: false },
  { id: 'a03', who: 'sa', t: 'Quarterly OKR planning doc',                  tpo: 'day+',     freq: 'quarterly', energy: 'neutral',    team_auto: 'no',    flagged: false },
  { id: 'a04', who: 'sa', t: 'Manual DB backup before deploys',             tpo: '<30m',     freq: 'weekly',    energy: 'draining',   team_auto: 'yes',   flagged: true  },
  { id: 'a05', who: 'ma', t: 'On-call Sunday handoff write-up',             tpo: '30m-2h',   freq: 'weekly',    energy: 'draining',   team_auto: 'maybe', flagged: false },
  { id: 'a06', who: 'ma', t: 'Daily standup',                               tpo: '<30m',     freq: 'daily',     energy: 'neutral',    team_auto: 'no',    flagged: false },
  { id: 'a07', who: 'ma', t: 'Drafting release notes',                      tpo: '30m-2h',   freq: 'weekly',    energy: 'neutral',    team_auto: 'yes',   flagged: true  },
  { id: 'a08', who: 'ma', t: 'Escalating customer tickets',                 tpo: 'half-day', freq: 'weekly',    energy: 'draining',   team_auto: 'maybe', flagged: false },
  { id: 'a09', who: 'je', t: 'Reviewing schema migrations',                 tpo: '30m-2h',   freq: 'weekly',    energy: 'energizing', team_auto: 'no',    flagged: false },
  { id: 'a10', who: 'je', t: 'Renew SSL certs quarterly',                   tpo: '<30m',     freq: 'quarterly', energy: 'draining',   team_auto: 'yes',   flagged: true  },
  { id: 'a11', who: 'je', t: 'Update on-call runbook entries',              tpo: '<30m',     freq: 'monthly',   energy: 'neutral',    team_auto: 'maybe', flagged: false },
  { id: 'a12', who: 'pr', t: 'Postmortem writing',                          tpo: 'day+',     freq: 'monthly',   energy: 'neutral',    team_auto: 'no',    flagged: false },
  { id: 'a13', who: 'pr', t: 'Architecture diagrams for stakeholders',      tpo: 'half-day', freq: 'monthly',   energy: 'energizing', team_auto: 'maybe', flagged: false },
  { id: 'a14', who: 'pr', t: 'Roadmap sync prep with PM',                   tpo: '30m-2h',   freq: 'weekly',    energy: 'neutral',    team_auto: 'no',    flagged: false },
  { id: 'a15', who: 'de', t: '1:1s with reports',                           tpo: '<30m',     freq: 'weekly',    energy: 'energizing', team_auto: 'no',    flagged: false },
  { id: 'a16', who: 'de', t: 'Performance review cycle',                    tpo: 'day+',     freq: 'quarterly', energy: 'draining',   team_auto: 'no',    flagged: false },
  { id: 'a17', who: 'na', t: 'Slack DM triage of "quick questions"',        tpo: '30m-2h',   freq: 'daily',     energy: 'draining',   team_auto: 'maybe', flagged: true  },
  { id: 'a18', who: 'na', t: 'Promoting feature flags through environments',tpo: '<30m',     freq: 'daily',     energy: 'neutral',    team_auto: 'yes',   flagged: false },
];

// Effort: unified hours/week estimate, the team's "velocity" number.
// Lets us sort + compare across cadences. <30m daily and 30m-2h weekly land on similar h/wk.
const TPO_HOURS  = { '<30m': 0.5, '30m-2h': 1.25, 'half-day': 4, 'day+': 8 };          // typical hrs/occurrence
const FREQ_PER_WK = { daily: 5, weekly: 1, monthly: 0.23, quarterly: 0.077, adhoc: 0.3 };

window.WA_EFFORT = (a) => {
  const hrs = TPO_HOURS[a.tpo] * FREQ_PER_WK[a.freq];
  // Round bucket for display
  const display = hrs < 1 ? '<1 h/wk'
                : hrs < 1.5 ? '~1 h/wk'
                : hrs < 3   ? `~${hrs.toFixed(1)} h/wk`
                : hrs < 8   ? `~${Math.round(hrs)} h/wk`
                : '8+ h/wk';
  return { hrs, display };
};

// Scoring — v0.3 model
//   effort = hrs/wk           (0..10+)
//   energy = drain weight     (energizing=0, neutral=1, draining=2)
//   matrix  X: effort (normalize to 0..1 via /8)
//   matrix  Y: energy (energizing=0 -> bottom, draining=2 -> top)
window.WA_SCORES = (a) => {
  const effort = TPO_HOURS[a.tpo] * FREQ_PER_WK[a.freq];
  const energy = { energizing: 0, neutral: 1, draining: 2 }[a.energy];
  const auto = a.team_auto === 'yes' ? 3
             : a.team_auto === 'maybe' ? 1.5
             : a.team_auto === 'no' ? 0
             : null;
  return { effort, energy, auto };
};

window.WA_PERSON = (id) => window.WA_TEAM.find(p => p.id === id);
