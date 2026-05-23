// Engineer-facing screens: Join, Empty Board, Active Board, Add Activity
// v2 — 3 questions (time / frequency / energy), no automate; team feed includes suggestions

function EngineerJoin() {
  return (
    <div className="wa-screen" style={{ background:'var(--paper)' }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', height:'100%' }}>
        <div style={{ padding: '64px', display:'flex', flexDirection:'column', justifyContent:'space-between', borderRight:'1px solid var(--rule)' }}>
          <div className="wa-brand">
            <span className="wa-brandmark">W</span>
            <span>Work Audit</span>
          </div>
          <div>
            <Eyebrow>You've been invited</Eyebrow>
            <h1 className="wa-display" style={{ fontSize: 44, lineHeight: 1.05, margin:'12px 0 18px', letterSpacing:'-0.02em' }}>
              The Platform team is<br/>auditing its work.
            </h1>
            <p style={{ color:'var(--muted)', fontSize: 15, lineHeight: 1.55, maxWidth: 440, marginBottom: 24 }}>
              Devon is hosting. You'll list the recurring work you actually do,
              and tag each item with three quick questions. Takes about ten minutes.
            </p>
            <div style={{ display:'grid', gap: 8, marginBottom: 16 }}>
              {[
                ['→', 'No account, no email — just your name'],
                ['→', 'Your answers stay in this session'],
                ['→', 'You can see what your teammates submit'],
              ].map(([a, b], i) => (
                <div key={i} style={{ display:'flex', gap: 10, alignItems:'baseline' }}>
                  <span className="wa-mono" style={{ color:'var(--rust)', fontSize: 12 }}>{a}</span>
                  <span style={{ color:'var(--ink-2)' }}>{b}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="wa-mono" style={{ fontSize: 10, color:'var(--muted-2)', letterSpacing:'0.06em', textTransform:'uppercase' }}>
            ↳ session id · platform-q2-7f3k · expires in 23h 41m
          </div>
        </div>

        <div style={{ padding: '64px', display:'flex', flexDirection:'column', justifyContent:'center', background:'var(--cream)' }}>
          <div style={{ maxWidth: 380 }}>
            <Eyebrow>Join the session</Eyebrow>
            <h2 className="wa-display" style={{ fontSize: 30, margin:'10px 0 28px', fontWeight: 500 }}>What should we call you?</h2>

            <div style={{ marginBottom: 18 }}>
              <label className="wa-label">Your name</label>
              <input className="wa-input" style={{ fontSize: 18, padding:'12px 14px' }} value="Marco Reyes" readOnly />
              <div className="wa-mono" style={{ fontSize: 11, color:'var(--muted-2)', marginTop: 6 }}>↳ shown to teammates, not stored after session ends</div>
            </div>

            <div style={{ marginBottom: 28 }}>
              <label className="wa-label">Role (optional)</label>
              <div className="wa-seg" style={{ display:'flex', flexWrap:'wrap' }}>
                <button className="is-on">IC</button>
                <button>EM</button>
                <button>PM</button>
                <button>UX</button>
                <button>Other</button>
              </div>
              <div className="wa-mono" style={{ fontSize: 10, color:'var(--muted-2)', marginTop: 6, letterSpacing:'0.04em' }}>
                ↳ used for filtering · IC is fine for most engineers
              </div>
            </div>

            <button className="wa-btn" style={{ padding:'12px 20px', fontSize: 14 }}>
              Join Platform · Q2 audit →
            </button>

            <p style={{ marginTop: 28, fontSize: 12, color:'var(--muted)', lineHeight: 1.5 }}>
              Four people are already inside, two more invited. <br/>
              Submissions open when Devon hits start.
            </p>
          </div>
        </div>
      </div>

      <ArtboardFooter idx="03" label="ENGINEER · JOIN" />
    </div>
  );
}

// Shared layout shell for the engineer board
function EngineerBoardShell({ title, sub, children, asPerson, count, timer, feedItems, suggestions, promptHighlight }) {
  const person = asPerson || WA_PERSON('ma');
  return (
    <div className="wa-screen" style={{ background:'var(--paper)' }}>
      <Topbar
        title={title}
        sub={sub}
        right={
          <>
            <span className="wa-tick">{timer}</span>
            <span style={{ width: 1, height: 16, background:'var(--rule)' }} />
            <span className="wa-tick">{count} activities</span>
            <span style={{ width: 1, height: 16, background:'var(--rule)' }} />
            <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
              <Avatar person={person} size="sm" />
              <span style={{ fontSize: 12, fontWeight: 500 }}>{person.name}</span>
            </div>
          </>
        }
      />

      <div style={{ display:'grid', gridTemplateColumns:'220px 1fr 296px', height:'calc(100% - 53px)' }}>
        {/* LEFT — prompt rail */}
        <aside style={{ padding:'24px 20px', borderRight:'1px solid var(--rule)', background:'var(--paper)', overflowY:'auto' }}>
          <div className="wa-eyebrow" style={{ marginBottom: 14 }}>↳ Recall prompts</div>
          <p style={{ fontSize: 12, color:'var(--muted)', lineHeight: 1.5, marginBottom: 18 }}>
            Use these as triggers. Don't filter — list everything that comes to mind. Edit later.
          </p>
          <div style={{ display:'grid', gap: 4 }}>
            {[
              'Yesterday & this week',
              'Weekly recurring meetings',
              'Monthly rituals',
              'Quarterly cycles',
              'Annual / one-offs',
              'Things you procrastinate',
              'Manual but should be automatic',
              'Where you get interrupted',
              'Hidden work your team doesn\'t see',
            ].map((p, i) => (
              <div key={i} style={{
                padding: '8px 10px',
                borderRadius: 4,
                fontSize: 13,
                color: i === promptHighlight ? 'var(--ink)' : 'var(--ink-2)',
                background: i === promptHighlight ? '#fff' : 'transparent',
                border: i === promptHighlight ? '1px solid var(--border)' : '1px solid transparent',
                cursor: 'pointer',
                display:'flex',
                alignItems:'center',
                gap: 8,
              }}>
                <span className="wa-mono" style={{ fontSize: 10, color:'var(--muted-2)' }}>{String(i+1).padStart(2,'0')}</span>
                <span>{p}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* CENTER */}
        <main style={{ padding:'28px 36px', overflowY:'auto', background:'var(--cream)' }}>
          {children}
        </main>

        {/* RIGHT — suggestions + live team feed */}
        <aside style={{ borderLeft:'1px solid var(--rule)', background:'var(--paper)', overflowY:'auto', display:'flex', flexDirection:'column' }}>
          {/* SUGGESTIONS */}
          {suggestions && suggestions.length ? (
            <div style={{ padding:'20px 18px 14px', borderBottom:'1px solid var(--border-soft)' }}>
              <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom: 6 }}>
                <div className="wa-eyebrow" style={{ color:'var(--rust)' }}>↳ Have you got these too?</div>
                <span className="wa-mono" style={{ fontSize: 10, color:'var(--muted-2)' }}>{suggestions.length}</span>
              </div>
              <p style={{ fontSize: 11, color:'var(--muted)', marginBottom: 4, lineHeight: 1.45 }}>
                Pulled from your team's submissions. Tap to draft a card —
              </p>
              <p style={{ fontSize: 10.5, color:'var(--muted-2)', marginBottom: 10, lineHeight: 1.45, fontStyle:'italic' }}>
                you'll answer the 3 questions for <em>your</em> situation. Daily for Sarah might be weekly for you.
              </p>
              <div style={{ display:'grid', gap: 6 }}>
                {suggestions.map((s, i) => (
                  <button key={i} style={{
                    background:'#fff', border:'1px dashed var(--rust)',
                    borderRadius: 4, padding:'9px 10px', textAlign:'left', cursor:'pointer',
                    display:'flex', gap: 8, alignItems:'flex-start',
                  }}>
                    <span style={{ color:'var(--rust)', fontFamily:'var(--font-mono)', fontSize: 13, lineHeight: 1, paddingTop: 1 }}>+</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5, color:'var(--ink)', fontWeight: 500, lineHeight: 1.3, marginBottom: 3 }}>{s.text}</div>
                      <div className="wa-mono" style={{ fontSize: 10, color:'var(--muted)', letterSpacing:'0.04em' }}>
                        ↳ logged by {s.who}{s.count > 1 ? ` · ${s.count} on the team` : ''}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* LIVE STREAM */}
          <div style={{ padding:'18px 18px 24px', flex: 1 }}>
            <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom: 10 }}>
              <div className="wa-eyebrow">↳ Team is submitting</div>
              <span className="wa-dot is-pulsing" />
            </div>
            <div style={{ display:'grid', gap: 8 }}>
              {feedItems.map((a) => {
                const p = WA_PERSON(a.who);
                return (
                  <div key={a.id} style={{ background:'#fff', border:'1px solid var(--border-soft)', borderRadius: 4, padding:'9px 10px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap: 6, marginBottom: 6 }}>
                      <div className="wa-avatar is-sm" style={{ background: p.color, color:'#fff' }}>{p.initials}</div>
                      <span style={{ fontSize: 11, color:'var(--muted)' }}>{p.name.split(' ')[0]}</span>
                      <span className="wa-mono" style={{ fontSize: 10, color:'var(--muted-2)', marginLeft:'auto' }}>{a._ago || 'just now'}</span>
                    </div>
                    <div style={{ fontSize: 12.5, color:'var(--ink-2)', lineHeight: 1.35, marginBottom: 6 }}>{a.t}</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap: 3, alignItems:'center' }}>
                      <EffortPill a={a} size="sm" />
                      <span className={`wa-chip ${ENERGY_TONE[a.energy]}`} style={{ padding:'2px 5px', fontSize: 10 }}>{ENERGY_SHORT[a.energy]}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      <ArtboardFooter idx="04" label="ENGINEER · BOARD" />
    </div>
  );
}

function EngineerBoardEmpty() {
  const feedItems = [
    { ...WA_ACTIVITIES[0], _ago: '20s' },
    { ...WA_ACTIVITIES[9], _ago: '45s' },
    { ...WA_ACTIVITIES[14], _ago: '1m' },
  ];
  const suggestions = [
    { text: 'Triaging Sentry / pager alerts',     who: 'Sarah',  count: 2 },
    { text: 'Reviewing PRs from teammates',       who: 'Sarah',  count: 3 },
    { text: 'Updating on-call documentation',     who: 'Jess',   count: 1 },
  ];
  return (
    <EngineerBoardShell
      title="Platform team · Q2 audit"
      sub="ENGINEER VIEW · IN PROGRESS"
      count={0}
      timer="09:42 LEFT"
      asPerson={WA_PERSON('ma')}
      feedItems={feedItems}
      suggestions={suggestions}
      promptHighlight={0}
    >
      <div style={{ maxWidth: 720 }}>
        <Eyebrow>Submitting as Marco · 0 activities</Eyebrow>
        <h2 className="wa-display" style={{ fontSize: 30, margin:'10px 0 14px', fontWeight: 500, letterSpacing:'-0.01em' }}>
          List the recurring work you do.
        </h2>
        <p style={{ color:'var(--ink-2)', fontSize: 14.5, lineHeight: 1.55, maxWidth: 580, marginBottom: 28 }}>
          One activity per card. Be specific but quick — "Triage Sentry alerts" not "deal with errors."
          Three questions per card. You can edit anything before discussion starts.
        </p>

        <button style={{
          width:'100%', textAlign:'left', padding:'22px 22px',
          background:'#fff', border:'1.5px dashed var(--rule)', borderRadius: 6,
          cursor:'pointer', display:'flex', alignItems:'center', gap: 14, marginBottom: 12,
        }}>
          <span style={{
            width: 36, height: 36, borderRadius: '50%',
            background:'var(--ink)', color:'var(--cream)',
            display:'inline-flex', alignItems:'center', justifyContent:'center',
            fontSize: 18, fontFamily:'var(--font-mono)', fontWeight: 500,
          }}>+</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>Add your first activity</div>
            <div style={{ fontSize: 12, color:'var(--muted)', marginTop: 2 }}>Start with what you did yesterday or this morning</div>
          </div>
          <span className="wa-mono" style={{ marginLeft:'auto', fontSize: 11, color:'var(--muted-2)' }}>↵</span>
        </button>

        <div style={{ display:'grid', gap: 8, opacity: 0.42 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{
              height: 64, borderRadius: 6, border:'1px dashed var(--rule)',
              background: 'transparent',
              display:'flex', alignItems:'center', padding:'0 16px',
              color:'var(--muted-2)', fontSize: 13,
            }}>
              <span className="wa-mono" style={{ fontSize: 11, marginRight: 12 }}>{String(i+1).padStart(2,'0')}</span>
              <span>Empty activity slot</span>
            </div>
          ))}
        </div>

        <hr className="wa-rule" style={{ margin:'32px 0 16px' }} />

        <div style={{ display:'flex', gap: 12, alignItems:'center' }}>
          <span className="wa-mono" style={{ fontSize: 11, color:'var(--muted)' }}>↳ STUCK?</span>
          <span style={{ fontSize: 13, color:'var(--ink-2)' }}>Tap a prompt on the left, or grab a "have you got this too?" suggestion from the right →</span>
        </div>
      </div>
    </EngineerBoardShell>
  );
}

function EngineerBoardActive() {
  const myActivities = WA_ACTIVITIES.filter(a => a.who === 'ma');
  const feedItems = [
    { ...WA_ACTIVITIES[0],  _ago: '12s' },
    { ...WA_ACTIVITIES[3],  _ago: '34s' },
    { ...WA_ACTIVITIES[9],  _ago: '58s' },
    { ...WA_ACTIVITIES[16], _ago: '1m'  },
    { ...WA_ACTIVITIES[12], _ago: '2m'  },
  ];
  const suggestions = [
    { text: 'Reviewing schema migrations',         who: 'Jess',    count: 1 },
    { text: 'Postmortem write-ups',                who: 'Priya',   count: 1 },
    { text: 'Promoting feature flags between envs',who: 'Nadia',   count: 1 },
  ];
  return (
    <EngineerBoardShell
      title="Platform team · Q2 audit"
      sub="ENGINEER VIEW · IN PROGRESS"
      count={myActivities.length}
      timer="06:18 LEFT"
      asPerson={WA_PERSON('ma')}
      feedItems={feedItems}
      suggestions={suggestions}
      promptHighlight={1}
    >
      <div style={{ maxWidth: 740 }}>
        <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom: 14 }}>
          <div>
            <Eyebrow>Submitting as Marco · {myActivities.length} activities</Eyebrow>
            <h2 className="wa-display" style={{ fontSize: 28, margin:'8px 0 0', fontWeight: 500 }}>
              Your recurring work
            </h2>
          </div>
          <div className="wa-tabs">
            <button className="is-on">Yours ({myActivities.length})</button>
            <button>All team (12)</button>
          </div>
        </div>

        <div style={{ display:'grid', gap: 8, marginBottom: 12 }}>
          {myActivities.map((a, i) => (
            <div key={a.id} className="wa-activity" style={{ position:'relative' }}>
              <div style={{ display:'flex', alignItems:'center', gap: 12, marginBottom: 10 }}>
                <span className="wa-mono" style={{ fontSize: 11, color:'var(--muted-2)' }}>{String(i+1).padStart(2,'0')}</span>
                <p className="wa-activity-title" style={{ margin: 0, flex: 1 }}>{a.t}</p>
                <EffortPill a={a} />
                <span className="wa-mono" style={{ fontSize: 10, color:'var(--muted-2)' }}>edit · ⋮</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1.3fr 1fr 1fr', gap: 10 }}>
                <QStrip label="Time per occurrence" value={a.tpo}
                        options={[['<30m','< 30 min'],['30m-2h','30m–2h'],['half-day','½ day'],['day+','1+ day']]} />
                <QStrip label="How often" value={a.freq}
                        options={[['daily','Daily'],['weekly','Weekly'],['monthly','Monthly'],['quarterly','Qtrly'],['adhoc','Ad hoc']]} />
                <QStrip label="Energy" value={a.energy}
                        options={[['energizing','Energizes'],['neutral','Neutral'],['draining','Drains']]} />
              </div>
            </div>
          ))}
        </div>

        <button style={{
          width:'100%', textAlign:'left', padding:'14px 18px',
          background:'transparent', border:'1.5px dashed var(--rule)', borderRadius: 6,
          cursor:'pointer', display:'flex', alignItems:'center', gap: 12,
          color:'var(--muted)', fontSize: 13.5, fontWeight: 500,
        }}>
          <span style={{ fontSize: 16, color:'var(--ink)' }}>+</span>
          Add another activity
          <span className="wa-mono" style={{ marginLeft:'auto', fontSize: 10, color:'var(--muted-2)' }}>⌘N</span>
        </button>

        <div style={{ display:'flex', alignItems:'center', gap: 10, marginTop: 24, padding:'12px 14px', background:'var(--sage-bg)', borderRadius: 4, border:'1px solid #c8d2b1' }}>
          <span style={{ color:'var(--sage)', fontSize: 14 }}>✓</span>
          <span style={{ fontSize: 13, color:'#3b4a2b' }}>
            You're done — automatability is decided together when Devon opens discussion. Edit anything until then.
          </span>
        </div>
      </div>
    </EngineerBoardShell>
  );
}

function QStrip({ label, value, options }) {
  return (
    <div>
      <div className="wa-mono" style={{ fontSize: 10, color:'var(--muted-2)', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ display:'flex', borderRadius: 3, overflow:'hidden', border:'1px solid var(--border-soft)' }}>
        {options.map(([v, lbl], i) => {
          const on = v === value;
          return (
            <div key={v} style={{
              flex: 1, padding:'5px 4px', textAlign:'center', fontSize: 10.5,
              background: on ? 'var(--ink)' : '#fff',
              color: on ? 'var(--cream)' : 'var(--muted-2)',
              fontWeight: on ? 500 : 400,
              borderRight: i < options.length - 1 ? '1px solid var(--border-soft)' : 'none',
            }}>
              {lbl}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EngineerAddActivity() {
  const myActivities = WA_ACTIVITIES.filter(a => a.who === 'ma').slice(0, 2);
  const feedItems = [
    { ...WA_ACTIVITIES[3],  _ago: '4s'  },
    { ...WA_ACTIVITIES[0],  _ago: '32s' },
    { ...WA_ACTIVITIES[9],  _ago: '58s' },
  ];
  const suggestions = [
    { text: 'Postmortem write-ups',                who: 'Priya', count: 1 },
    { text: 'Customer ticket escalations',         who: 'Marco', count: 1 },
  ];
  return (
    <EngineerBoardShell
      title="Platform team · Q2 audit"
      sub="ENGINEER · ADDING ACTIVITY"
      count={myActivities.length}
      timer="07:54 LEFT"
      asPerson={WA_PERSON('ma')}
      feedItems={feedItems}
      suggestions={suggestions}
      promptHighlight={6}
    >
      <div style={{ maxWidth: 740 }}>
        <Eyebrow>Submitting as Marco · {myActivities.length} activities · adding 1</Eyebrow>
        <h2 className="wa-display" style={{ fontSize: 28, margin:'8px 0 18px', fontWeight: 500 }}>
          New activity
        </h2>

        <div className="wa-card" style={{ padding: 22, marginBottom: 16, boxShadow:'0 1px 0 var(--border), 0 8px 28px rgba(28,26,22,0.06)' }}>
          <label className="wa-label">What's the activity?</label>
          <input className="wa-input" style={{ fontSize: 17, padding:'12px 14px', marginBottom: 6 }}
                 value="Drafting release notes after each deploy" readOnly />
          <div style={{ fontSize: 11, color:'var(--muted-2)', marginBottom: 22, display:'flex', gap: 8 }}>
            <span className="wa-mono">↳</span>
            <span>One activity per card · be specific but quick</span>
          </div>

          <div style={{ display:'grid', gap: 18 }}>
            <QuestionBlock
              num="01"
              q="How long does this take, each time?"
              hint="Honest average — including the &quot;just one more thing&quot; stretch"
              options={[
                ['<30m',     'Under 30 min', 'minutes'],
                ['30m-2h',   '30 min – 2 hrs','a couple hours'],
                ['half-day', 'Half a day',    'a chunk'],
                ['day+',     'A full day or more','all in'],
              ]}
              value="30m-2h"
            />
            <QuestionBlock
              num="02"
              q="How often does it happen?"
              hint="Roughly — pick the nearest cadence"
              options={[
                ['daily',     'Daily',      'every day'],
                ['weekly',    'Weekly',     'each week'],
                ['monthly',   'Monthly',    'each month'],
                ['quarterly', 'Quarterly',  'each quarter'],
                ['adhoc',     'Ad hoc',     'unpredictable'],
              ]}
              value="weekly"
            />
            <QuestionBlock
              num="03"
              q="How does it feel to do?"
              hint="Gut check — energy is fine to share honestly"
              options={[
                ['energizing','Energizes me', 'I like doing it'],
                ['neutral',   'Neutral',      'I just do it'],
                ['draining',  'Drains me',    'I dread it'],
              ]}
              value="neutral"
            />
          </div>

          <div style={{ marginTop: 22, padding:'10px 12px', background:'var(--paper-deep)', borderRadius: 4, fontSize: 12, color:'var(--ink-2)', display:'flex', gap: 10, alignItems:'flex-start' }}>
            <span style={{ color:'var(--muted)', fontFamily:'var(--font-mono)', fontSize: 11, paddingTop: 1 }}>↳</span>
            <span>
              <strong>Automatable?</strong> Not asked here — the team decides together during discussion.
              That way the call benefits from everyone's context, not just yours.
            </span>
          </div>

          <hr className="wa-rule" style={{ margin:'18px 0 16px' }} />
          <div style={{ display:'flex', alignItems:'center', gap: 12 }}>
            <button className="wa-btn">Save activity</button>
            <button className="wa-btn is-ghost">Save & add another</button>
            <span style={{ marginLeft:'auto', fontSize: 12, color:'var(--muted)' }}>Esc · cancel</span>
          </div>
        </div>

        <div style={{ display:'grid', gap: 8, opacity: 0.55 }}>
          {myActivities.map((a, i) => (
            <div key={a.id} className="wa-activity">
              <div style={{ display:'flex', alignItems:'center', gap: 12 }}>
                <span className="wa-mono" style={{ fontSize: 11, color:'var(--muted-2)' }}>{String(i+1).padStart(2,'0')}</span>
                <p className="wa-activity-title" style={{ margin: 0, flex: 1 }}>{a.t}</p>
                <ActivityChipsShort a={a} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </EngineerBoardShell>
  );
}

function QuestionBlock({ num, q, hint, options, value }) {
  return (
    <div>
      <div style={{ display:'flex', alignItems:'baseline', gap: 10, marginBottom: 6 }}>
        <span className="wa-mono" style={{ fontSize: 10, color:'var(--muted-2)', letterSpacing:'0.08em' }}>{num}</span>
        <span style={{ fontSize: 14, fontWeight: 500 }}>{q}</span>
        <span style={{ fontSize: 12, color:'var(--muted)', fontStyle:'italic', marginLeft: 4 }}>{hint}</span>
      </div>
      <div style={{ display:'flex', gap: 6 }}>
        {options.map(([v, label, sub]) => {
          const on = v === value;
          return (
            <button key={v} style={{
              flex: 1, padding:'9px 10px', textAlign:'left',
              background: on ? 'var(--ink)' : '#fff',
              color: on ? 'var(--cream)' : 'var(--ink)',
              border:'1px solid ' + (on ? 'var(--ink)' : 'var(--rule)'),
              borderRadius: 4, cursor:'pointer',
              display:'flex', flexDirection:'column', gap: 2,
              minWidth: 0,
            }}>
              <span style={{ fontSize: 12.5, fontWeight: 500 }}>{label}</span>
              <span style={{ fontSize: 10.5, opacity: 0.7, fontFamily:'var(--font-mono)' }}>{sub}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

window.EngineerJoin = EngineerJoin;
window.EngineerBoardEmpty = EngineerBoardEmpty;
window.EngineerBoardActive = EngineerBoardActive;
window.EngineerAddActivity = EngineerAddActivity;
