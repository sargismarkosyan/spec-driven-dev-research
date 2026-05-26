// Seed script — creates a realistic platform-team work audit session
// Usage: node scripts/seed.mjs
import { io } from 'socket.io-client';

const BASE = 'http://localhost:3050';

async function post(path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json();
}

async function joinAndSubmit(sessionId, engineer) {
  return new Promise((resolve, reject) => {
    const sock = io(BASE, { transports: ['websocket'] });
    let participantId = null;

    sock.on('connect', () => {
      sock.emit('join-session', {
        sessionId,
        name: engineer.name,
        role: engineer.role,
      });
    });

    sock.on('session:state', async (data) => {
      participantId = sock.id;
      for (const a of engineer.activities) {
        sock.emit('activity:add', { sessionId, ...a });
        await new Promise(r => setTimeout(r, 60));
      }
      await new Promise(r => setTimeout(r, 400));
      sock.disconnect();
      resolve(participantId);
    });

    sock.on('connect_error', reject);
    setTimeout(() => { sock.disconnect(); resolve(participantId); }, 8000);
  });
}

const ENGINEERS = [
  {
    name: 'Sarah Chen', role: 'IC',
    activities: [
      { title: 'PagerDuty alert triage',            tpo: '<30m',    freq: 'daily',     energy: 'draining'   },
      { title: 'Post-incident write-ups',            tpo: '30m-2h',  freq: 'weekly',    energy: 'tedious'    },
      { title: 'Runbook & playbook updates',         tpo: '30m-2h',  freq: 'monthly',   energy: 'fine'       },
      { title: 'On-call handoff notes',              tpo: '<30m',    freq: 'weekly',    energy: 'tedious'    },
      { title: 'SLO dashboard review & commentary',  tpo: '30m-2h',  freq: 'weekly',    energy: 'fine'       },
    ],
  },
  {
    name: 'Marcus Webb', role: 'IC',
    activities: [
      { title: 'Code review & PR approvals',         tpo: '30m-2h',  freq: 'daily',     energy: 'fine'       },
      { title: 'Weekly deployment sign-offs',        tpo: '<30m',    freq: 'weekly',    energy: 'fine'       },
      { title: 'API changelog updates',              tpo: '30m-2h',  freq: 'monthly',   energy: 'tedious'    },
      { title: 'Dependency version bumps',           tpo: '30m-2h',  freq: 'monthly',   energy: 'tedious'    },
      { title: 'Architecture decision records',      tpo: 'half-day', freq: 'quarterly', energy: 'energizing' },
    ],
  },
  {
    name: 'Jake Torres', role: 'IC',
    activities: [
      { title: 'CI pipeline failure triage',         tpo: '<30m',    freq: 'daily',     energy: 'draining'   },
      { title: 'Provisioning dev environments',      tpo: '30m-2h',  freq: 'weekly',    energy: 'tedious'    },
      { title: 'TLS certificate renewals',           tpo: '30m-2h',  freq: 'quarterly', energy: 'tedious'    },
      { title: 'Cloud cost anomaly review',          tpo: '<30m',    freq: 'monthly',   energy: 'fine'       },
      { title: 'Terraform plan reviews',             tpo: '30m-2h',  freq: 'weekly',    energy: 'fine'       },
    ],
  },
  {
    name: 'Amy Liu', role: 'IC',
    activities: [
      { title: 'Sentry error / bug triage',          tpo: '<30m',    freq: 'daily',     energy: 'fine'       },
      { title: 'Stakeholder status update emails',   tpo: '30m-2h',  freq: 'weekly',    energy: 'tedious'    },
      { title: 'Cross-team sync meetings',           tpo: '30m-2h',  freq: 'weekly',    energy: 'draining'   },
      { title: 'Feature flag & dead-code cleanup',   tpo: '30m-2h',  freq: 'monthly',   energy: 'tedious'    },
      { title: 'Release notes drafting',             tpo: '30m-2h',  freq: 'monthly',   energy: 'tedious'    },
    ],
  },
  {
    name: 'Daniel Park', role: 'IC',
    activities: [
      { title: 'Sprint planning & story estimation', tpo: '30m-2h',  freq: 'weekly',    energy: 'fine'       },
      { title: 'Quarterly OKR reporting slides',     tpo: 'half-day', freq: 'quarterly', energy: 'tedious'    },
      { title: 'Updating Jira tickets after standup',tpo: '<30m',    freq: 'daily',     energy: 'draining'   },
      { title: 'Perf-review self-assessments',       tpo: 'half-day', freq: 'quarterly', energy: 'tedious'    },
      { title: 'Mentoring junior engineers',         tpo: '30m-2h',  freq: 'weekly',    energy: 'energizing' },
    ],
  },
];

(async () => {
  // 1. Create session
  const { id: sessionId, token } = await post('/api/sessions', {
    name: 'Platform team · Q2 work audit',
    facilitatorName: 'Priya Nair',
    submissionWindowMin: 15,
    liveTeamFeed: true,
  });
  console.log(`Session: ${sessionId}  token: ${token}`);

  // 2. Start session
  await post(`/api/sessions/${sessionId}/start`, { token });
  console.log('Session started');

  // 3. Each engineer joins and submits
  for (const eng of ENGINEERS) {
    await joinAndSubmit(sessionId, eng);
    console.log(`  ✓ ${eng.name} — ${eng.activities.length} activities`);
  }

  // 4. Close submissions → discussion phase
  await post(`/api/sessions/${sessionId}/close`, { token });
  console.log('Submissions closed — discussion open');

  console.log(`\n→ Facilitator URL:\n  http://localhost:3050/session/${sessionId}/facilitator?token=${token}\n`);
})();
