// Facilitator: Live monitoring, Priority Matrix, Grouped view, Discussion (classify+flag), Export
// v2 — automatability is team-classified during discussion, NOT engineer-submitted.
//      Matrix gets BUILT through discussion. Unclassified activities sit in a "needs review" tray.

function MatrixDot({ a, x, y, size = 32, active }) {
  const p = WA_PERSON(a.who);
  // dot color reflects team's automatability verdict (the third dimension)
  const fill = a.team_auto === 'yes'   ? 'var(--rust)'
             : a.team_auto === 'maybe' ? 'var(--amber)'
             : a.team_auto === 'no'    ? '#8a8170'
             : '#fff';
  const isUnclassified = !a.team_auto || a.team_auto === 'unclassified';
  const textColor = isUnclassified ? 'var(--ink)' : '#fff';
  return (
    <div style={{ position:'absolute', left:`${x}%`, top:`${y}%`, transform:'translate(-50%, -50%)' }}>
      <div title={`${a.t} · ${WA_EFFORT(a).display} · ${ENERGY_LABEL[a.energy]}`} style={{
        width: size, height: size, borderRadius:'50%',
        background: fill,
        border: active ? '2.5px solid var(--ink)'
              : isUnclassified ? '1.5px dashed var(--muted-2)'
              : a.flagged ? '2px solid var(--ink)' : '1.5px solid rgba(0,0,0,0.15)',
        color: textColor,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize: 10, fontFamily:'var(--font-mono)', fontWeight: 600,
        boxShadow: active ? '0 0 0 4px rgba(28,26,22,0.08), 0 4px 12px rgba(0,0,0,0.12)' : '0 2px 6px rgba(0,0,0,0.08)',
        cursor: 'pointer', position:'relative',
      }}>
        {p.initials}
        {a.flagged ? (
          <span style={{ position:'absolute', top: -6, right: -6, fontSize: 11, lineHeight: 1, color:'var(--flag)' }}>★</span>
        ) : null}
      </div>
    </div>
  );
}

// Compute matrix coords:  X = effort (0..8 → 0..100), Y = energy (top=drains, bottom=energizes)
function matrixCoords(a) {
  const s = WA_SCORES(a);
  const x = Math.min(100, (s.effort / 8) * 100);
  const y = 100 - (s.energy / 2) * 100; // draining (2) → 0% (top); energizing (0) → 100% (bottom)
  return { x, y };
}

function FacilitatorBar({ active, count, flagged, classified }) {
  return (
    <Topbar
      title="Platform team · Q2 audit"
      sub={`FACILITATOR · ${count} activities · ${classified != null ? `${classified}/${count} classified · ` : ''}${flagged} flagged`}
      right={
        <>
          <div className="wa-tabs">
            <button className={active === 'discuss' ? 'is-on' : ''}>★ Discuss</button>
            <button className={active === 'matrix' ? 'is-on' : ''}>⊞ Matrix</button>
            <button className={active === 'grouped' ? 'is-on' : ''}>≡ Grouped</button>
          </div>
          <span style={{ width: 1, height: 16, background:'var(--rule)' }} />
          <button className="wa-btn is-ghost" style={{ padding:'6px 12px', fontSize: 12 }}>Export ↗</button>
        </>
      }
    />
  );
}

// ---- 07 · Live monitoring (during submission) ----
function FacilitatorLive() {
  const counts = { sa: 4, ma: 4, je: 3, pr: 3, de: 2, na: 2 };
  const recent = [
    { ...WA_ACTIVITIES[17], _ago: '6s'  },
    { ...WA_ACTIVITIES[3],  _ago: '24s' },
    { ...WA_ACTIVITIES[10], _ago: '38s' },
    { ...WA_ACTIVITIES[7],  _ago: '52s' },
    { ...WA_ACTIVITIES[13], _ago: '1m 4s' },
    { ...WA_ACTIVITIES[0],  _ago: '1m 22s' },
    { ...WA_ACTIVITIES[14], _ago: '1m 41s' },
    { ...WA_ACTIVITIES[6],  _ago: '2m'   },
  ];
  return (
    <div className="wa-screen" style={{ background:'var(--paper)' }}>
      <Topbar
        title="Platform team · Q2 audit"
        sub="FACILITATOR · SUBMISSIONS OPEN"
        right={
          <>
            <span style={{ display:'inline-flex', alignItems:'center', gap: 6 }}>
              <span className="wa-dot is-pulsing" style={{ background:'var(--rust)' }} />
              <span className="wa-mono" style={{ fontSize: 11, color:'var(--muted)' }}>04:12 LEFT</span>
            </span>
            <span style={{ width: 1, height: 16, background:'var(--rule)' }} />
            <button className="wa-btn is-ghost" style={{ padding:'6px 10px', fontSize: 12 }}>+ 2 min</button>
            <button className="wa-btn" style={{ padding:'6px 12px', fontSize: 12 }}>End → start discussion</button>
          </>
        }
      />

      <div style={{ display:'grid', gridTemplateColumns:'260px 1fr 1fr', height:'calc(100% - 53px)' }}>
        <aside style={{ padding:'24px 18px', borderRight:'1px solid var(--rule)', background:'var(--paper)', overflowY:'auto' }}>
          <div className="wa-eyebrow" style={{ marginBottom: 14 }}>↳ Submissions per person</div>
          <div style={{ display:'grid', gap: 8 }}>
            {WA_TEAM.map(p => {
              const n = counts[p.id] || 0;
              const status = n === 0 ? 'idle' : n < 3 ? 'low' : 'ok';
              return (
                <div key={p.id} style={{ display:'flex', alignItems:'center', gap: 10, padding:'9px 10px', background:'#fff', border:'1px solid var(--border-soft)', borderRadius: 4 }}>
                  <Avatar person={p} size="sm" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.name}</div>
                    <div className="wa-mono" style={{ fontSize: 10, color:'var(--muted)' }}>{n === 0 ? 'not started' : `${n} activities`}</div>
                  </div>
                  <span className="wa-mono" style={{ fontSize: 16, fontWeight: 600, color: status === 'ok' ? 'var(--sage)' : status === 'low' ? 'var(--amber)' : 'var(--rust)' }}>{n}</span>
                </div>
              );
            })}
          </div>
          <hr className="wa-rule" style={{ margin:'18px 0 14px' }} />
          <div className="wa-eyebrow" style={{ marginBottom: 8 }}>↳ Totals</div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize: 13 }}>
            <span style={{ color:'var(--muted)' }}>Activities so far</span>
            <span className="wa-mono" style={{ fontWeight: 600 }}>18</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize: 13, marginTop: 4 }}>
            <span style={{ color:'var(--muted)' }}>Per-engineer avg</span>
            <span className="wa-mono" style={{ fontWeight: 600 }}>3.0</span>
          </div>
        </aside>

        <main style={{ padding:'24px 28px', overflowY:'auto', background:'var(--cream)', borderRight:'1px solid var(--rule)' }}>
          <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom: 14 }}>
            <h3 className="wa-display" style={{ fontSize: 22, margin: 0, fontWeight: 500 }}>Live stream</h3>
            <span className="wa-tick">↳ newest first · auto-scrolling</span>
          </div>
          <div style={{ display:'grid', gap: 8 }}>
            {recent.map((a, i) => {
              const p = WA_PERSON(a.who);
              return (
                <div key={i} className="wa-activity">
                  <div style={{ display:'flex', alignItems:'center', gap: 10, marginBottom: 8 }}>
                    <Avatar person={p} size="sm" />
                    <span style={{ fontSize: 12, color:'var(--muted)' }}>{p.name}</span>
                    <span className="wa-mono" style={{ fontSize: 10, color:'var(--muted-2)' }}>{a._ago}</span>
                    <span style={{ marginLeft:'auto' }}><FacActions size="sm" /></span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8, display:'flex', alignItems:'center', gap: 10 }}>
                    <span style={{ flex: 1 }}>{a.t}</span>
                    <EffortPill a={a} />
                  </div>
                  <ActivityChipsShort a={a} />
                </div>
              );
            })}
          </div>
        </main>

        <aside style={{ padding:'24px 24px', background:'var(--paper)', overflowY:'auto' }}>
          <Eyebrow>↳ Emerging themes</Eyebrow>
          <p style={{ fontSize: 12, color:'var(--muted)', margin:'8px 0 18px', lineHeight: 1.5 }}>
            Patterns by topic — automatability gets decided together in discussion.
          </p>

          <div style={{ display:'grid', gap: 8, marginBottom: 22 }}>
            <ThemeRow n="3" label="Alert / queue triage" tone="rust"
                      sub="Sarah · Marco · Nadia" />
            <ThemeRow n="2" label="Manual deploy steps" tone="rust"
                      sub="Sarah · Nadia" />
            <ThemeRow n="2" label="Doc & runbook upkeep" tone="amber"
                      sub="Jess · Marco" />
            <ThemeRow n="2" label="Reviewing peers' work" tone=""
                      sub="Sarah · Jess" />
            <ThemeRow n="2" label="Stakeholder syncs / docs" tone=""
                      sub="Priya" />
          </div>

          <hr className="wa-rule" style={{ margin:'14px 0' }} />

          <Eyebrow>↳ Time-cost distribution</Eyebrow>
          <div style={{ marginTop: 12, display:'grid', gap: 8 }}>
            {[
              ['Daily',     7, 'is-rust'],
              ['Weekly',    6, 'is-amber'],
              ['Monthly',   3, ''],
              ['Quarterly', 2, ''],
            ].map(([label, n, tone], i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap: 10 }}>
                <span style={{ width: 70, fontSize: 12 }}>{label}</span>
                <div style={{ flex: 1, height: 6, background:'var(--paper-deep)', borderRadius: 3, overflow:'hidden' }}>
                  <div style={{ width: `${(n/8)*100}%`, height:'100%',
                                background: tone === 'is-rust' ? 'var(--rust)' : tone === 'is-amber' ? 'var(--amber)' : 'var(--slate)' }} />
                </div>
                <span className="wa-mono" style={{ fontSize: 11, color:'var(--muted)', width: 16, textAlign:'right' }}>{n}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <ArtboardFooter idx="07" label="FACILITATOR · LIVE" />
    </div>
  );
}

function ThemeRow({ n, label, sub, tone }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap: 10, padding:'9px 11px', background:'#fff', border:'1px solid var(--border-soft)', borderRadius: 4 }}>
      <span className="wa-mono" style={{ fontSize: 16, fontWeight: 600, color: tone ? `var(--${tone})` : 'var(--muted)' }}>{n}×</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12.5, fontWeight: 500 }}>{label}</div>
        <div className="wa-mono" style={{ fontSize: 10, color:'var(--muted-2)' }}>{sub}</div>
      </div>
    </div>
  );
}

// ---- 08 · Priority Matrix (energy × effort, color by team verdict) ----
function FacilitatorMatrix() {
  const flagged = WA_ACTIVITIES.filter(a => a.flagged).length;
  const classified = WA_ACTIVITIES.filter(a => a.team_auto && a.team_auto !== 'unclassified').length;
  return (
    <div className="wa-screen" style={{ background:'var(--paper)' }}>
      <FacilitatorBar active="matrix" count={WA_ACTIVITIES.length} flagged={flagged} classified={classified} />

      <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', height:'calc(100% - 53px)' }}>
        <main style={{ padding:'24px 32px', background:'var(--cream)', overflow:'hidden', position:'relative' }}>
          <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom: 14, gap: 16 }}>
            <div>
              <Eyebrow>Priority view · energy × effort · color = team verdict</Eyebrow>
              <h2 className="wa-display" style={{ fontSize: 24, margin:'6px 0 0', fontWeight: 500 }}>Where does the team bleed time on draining work?</h2>
            </div>
            <div style={{ display:'flex', gap: 6, alignItems:'center' }}>
              <span className="wa-eyebrow" style={{ marginRight: 6 }}>Filter ·</span>
              <span className="wa-chip">All roles ▾</span>
              <span className="wa-chip">All cadences ▾</span>
              <span className="wa-chip is-rust">Flagged only ▾</span>
            </div>
          </div>

          <div style={{ position:'relative', height:'calc(100% - 90px)', background:'#fff', border:'1px solid var(--rule)', borderRadius: 6, padding:'52px 48px 48px 60px' }}>
            {/* Plot area */}
            <div style={{ position:'absolute', top: 52, bottom: 48, left: 60, right: 48 }}>
              {/* Subtle bands by quadrant */}
              <div style={{ position:'absolute', inset: 0, borderRadius: 3, overflow:'hidden' }}>
                <div style={{ position:'absolute', top: 0, right: 0, width:'50%', height:'50%', background:'var(--rust-bg)', opacity: 0.45 }} />
                <div style={{ position:'absolute', bottom: 0, left: 0, width:'50%', height:'50%', background:'var(--sage-bg)', opacity: 0.35 }} />
              </div>
              {/* Cross-hair */}
              <div style={{ position:'absolute', top: 0, bottom: 0, left:'50%', borderLeft:'1px dashed var(--border-soft)' }} />
              <div style={{ position:'absolute', left: 0, right: 0, top:'50%', borderTop:'1px dashed var(--border-soft)' }} />

              {/* Quadrant labels (relative to plot area, won't drift) */}
              <div style={{ position:'absolute', top: 10, right: 12, textAlign:'right' }}>
                <div className="wa-eyebrow" style={{ color:'var(--rust)', fontWeight: 600 }}>↗ PRIORITY ZONE</div>
                <div style={{ fontSize: 11.5, color:'#6a2810', maxWidth: 200, marginTop: 4, lineHeight: 1.4 }}>Drains the team <em>and</em> eats their week. Fix or remove.</div>
              </div>
              <div style={{ position:'absolute', top: 10, left: 12 }}>
                <div className="wa-eyebrow">↖ TOLERABLE</div>
                <div style={{ fontSize: 11.5, color:'var(--muted)', maxWidth: 200, marginTop: 4, lineHeight: 1.4 }}>Annoying but small — accept, or quick-win if easy to remove.</div>
              </div>
              <div style={{ position:'absolute', bottom: 10, right: 12, textAlign:'right' }}>
                <div className="wa-eyebrow">↘ STRATEGIC</div>
                <div style={{ fontSize: 11.5, color:'var(--muted)', maxWidth: 200, marginTop: 4, lineHeight: 1.4 }}>Big work the team enjoys — celebrate, maybe invest more.</div>
              </div>
              <div style={{ position:'absolute', bottom: 10, left: 12 }}>
                <div className="wa-eyebrow" style={{ color:'#3b4a2b' }}>↙ HEALTHY DEFAULT</div>
                <div style={{ fontSize: 11.5, color:'#3b4a2b', maxWidth: 200, marginTop: 4, lineHeight: 1.4 }}>Energizing, low-cost work. Leave alone.</div>
              </div>

              {/* Dots */}
              {WA_ACTIVITIES.map(a => {
                const { x, y } = matrixCoords(a);
                return <MatrixDot key={a.id} a={a} x={x} y={y} size={a.flagged ? 36 : 30} />;
              })}
            </div>

            {/* Axis labels — outside plot area */}
            <div className="wa-mono" style={{ position:'absolute', bottom: 16, left:'50%', transform:'translateX(-50%)', fontSize: 10, color:'var(--muted)', letterSpacing:'0.1em' }}>
              ← LOW EFFORT &nbsp;·&nbsp; EFFORT (~ h/wk) &nbsp;·&nbsp; HIGH EFFORT →
            </div>
            <div className="wa-mono" style={{ position:'absolute', left: 18, top:'50%', transform:'rotate(-90deg) translateX(50%) translateY(-50%)', transformOrigin:'left center', fontSize: 10, color:'var(--muted)', letterSpacing:'0.1em', whiteSpace:'nowrap' }}>
              ← ENERGIZING &nbsp;·&nbsp; ENERGY &nbsp;·&nbsp; DRAINING →
            </div>

            {/* Top-left corner legend */}
            <div style={{ position:'absolute', top: 12, left: 16, display:'flex', alignItems:'center', gap: 14, fontSize: 11, color:'var(--muted)' }}>
              <span className="wa-mono" style={{ fontSize: 10, color:'var(--muted-2)', letterSpacing:'0.06em' }}>DOT =</span>
              <LegendDot color="var(--rust)"  label="Automatable" />
              <LegendDot color="var(--amber)" label="Maybe" />
              <LegendDot color="#8a8170"      label="Manual" />
              <LegendDot color="#fff"         dashed label="Unclassified" />
              <span style={{ marginLeft: 8 }}>★ flagged</span>
            </div>
          </div>
        </main>

        <aside style={{ padding:'24px 22px', borderLeft:'1px solid var(--rule)', background:'var(--paper)', overflowY:'auto' }}>
          <Eyebrow>Selected · 1 of {WA_ACTIVITIES.length}</Eyebrow>
          <h3 className="wa-display" style={{ fontSize: 20, margin:'8px 0 14px', fontWeight: 500, lineHeight: 1.25 }}>
            Triage Sentry alerts each morning
          </h3>

          <div style={{ display:'flex', alignItems:'center', gap: 10, marginBottom: 16 }}>
            <Avatar person={WA_PERSON('sa')} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>Sarah Lim</div>
              <div className="wa-mono" style={{ fontSize: 11, color:'var(--muted)' }}>Senior eng · IC</div>
            </div>
            <EffortPill a={WA_ACTIVITIES[0]} size="lg" />
          </div>

          <div style={{ display:'grid', gap: 8, marginBottom: 18 }}>
            <DetailRow k="Time / occ"  v="30 min – 2 hrs"  tone="" />
            <DetailRow k="Cadence"     v="Daily"           tone="is-rust" />
            <DetailRow k="Energy"      v="Drains"          tone="is-rust" />
            <DetailRow k="Team verdict" v="Automatable · classified in discussion" tone="is-rust" />
          </div>

          <hr className="wa-rule" />

          <div style={{ display:'flex', gap: 10, alignItems:'baseline', marginTop: 14, marginBottom: 8 }}>
            <span className="wa-eyebrow">Position</span>
            <span style={{ flex: 1, height: 1, background:'var(--border-soft)' }} />
          </div>

          <div className="wa-chip is-rust" style={{ fontWeight: 600, padding:'6px 10px' }}>↗ PRIORITY ZONE</div>
          <div style={{ fontSize: 12, color:'var(--muted)', marginTop: 8, lineHeight: 1.5 }}>
            6 h/wk · draining · automatable. Highest payback to fix.
          </div>

          <hr className="wa-rule" style={{ margin:'18px 0' }} />

          <button className="wa-btn is-rust" style={{ width:'100%', justifyContent:'center' }}>
            ★ Flag for next quarter
          </button>

          <div style={{ marginTop: 10, display:'flex', gap: 6, justifyContent:'center' }}>
            <FacActions />
          </div>

          <div style={{ marginTop: 14, padding:'10px 12px', background:'var(--paper-deep)', borderRadius: 4, fontSize: 12, color:'var(--ink-2)', lineHeight: 1.5 }}>
            <span className="wa-mono" style={{ fontSize: 10, color:'var(--muted)', display:'block', marginBottom: 4 }}>↳ TEAM DISCUSSION NOTE</span>
            "Most alerts are duplicates of three Postgres flakes. Auto-group before they hit Sarah."
          </div>
        </aside>
      </div>

      <ArtboardFooter idx="08" label="FACILITATOR · MATRIX" />
    </div>
  );
}

function LegendDot({ color, dashed, label }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap: 4 }}>
      <span style={{
        width: 11, height: 11, borderRadius:'50%',
        background: color,
        border: dashed ? '1.5px dashed var(--muted-2)' : '1.5px solid rgba(0,0,0,0.15)',
      }} />
      {label}
    </span>
  );
}

function DetailRow({ k, v, tone }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
      <span className="wa-mono" style={{ fontSize: 10, color:'var(--muted)', letterSpacing:'0.08em', textTransform:'uppercase', width: 96 }}>{k}</span>
      <span className={`wa-chip ${tone}`}>{v}</span>
    </div>
  );
}

function Bar({ label, value, max, tone, quadrant }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color:'var(--ink-2)' }}>{label}</span>
        <span className="wa-mono" style={{ fontSize: 11, color:'var(--muted)' }}>{quadrant || `${value} / ${max}`}</span>
      </div>
      {quadrant ? (
        <div className="wa-chip is-rust" style={{ fontWeight: 600 }}>↗ {quadrant}</div>
      ) : (
        <div style={{ height: 6, background:'var(--paper-deep)', borderRadius: 3, overflow:'hidden' }}>
          <div style={{ width:`${(value/max)*100}%`, height:'100%', background: tone === 'rust' ? 'var(--rust)' : 'var(--ink)' }} />
        </div>
      )}
    </div>
  );
}

// ---- 09 · Grouped view (by team-assigned automatability) ----
function FacilitatorGrouped() {
  const flagged = WA_ACTIVITIES.filter(a => a.flagged).length;
  const classified = WA_ACTIVITIES.filter(a => a.team_auto && a.team_auto !== 'unclassified').length;
  const groups = {
    yes:   { title: 'Automatable',     hint: 'Team agreed: yes · sorted by effort (h/wk)',          tone: 'rust',  items: WA_ACTIVITIES.filter(a => a.team_auto === 'yes')   },
    maybe: { title: 'Maybe',           hint: 'Team agreed: maybe · partial or needs scoping',        tone: 'amber', items: WA_ACTIVITIES.filter(a => a.team_auto === 'maybe') },
    no:    { title: 'Manual forever',  hint: 'Team agreed: human-judgement work · leave alone',      tone: 'slate', items: WA_ACTIVITIES.filter(a => a.team_auto === 'no')    },
  };
  Object.values(groups).forEach(g => {
    g.items.sort((a,b) => WA_EFFORT(b).hrs - WA_EFFORT(a).hrs);
  });
  return (
    <div className="wa-screen" style={{ background:'var(--paper)' }}>
      <FacilitatorBar active="grouped" count={WA_ACTIVITIES.length} flagged={flagged} classified={classified} />

      <div style={{ padding:'24px 32px', height:'calc(100% - 53px)', overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom: 16 }}>
          <div>
            <Eyebrow>Grouped by team verdict on automatability</Eyebrow>
            <h2 className="wa-display" style={{ fontSize: 22, margin:'4px 0 0', fontWeight: 500 }}>
              Three columns. Most-painful on top of each.
            </h2>
          </div>
          <div style={{ display:'flex', gap: 6, alignItems:'center' }}>
            <span className="wa-eyebrow" style={{ marginRight: 6 }}>Sort ·</span>
            <div className="wa-tabs">
              <button className="is-on">Effort</button>
              <button>Energy</button>
              <button>Person</button>
            </div>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap: 18, height:'calc(100% - 70px)' }}>
          {Object.entries(groups).map(([key, g]) => (
            <div key={key} style={{ background: key === 'yes' ? 'var(--rust-bg)' : key === 'maybe' ? 'var(--amber-bg)' : 'var(--paper-deep)',
                                    border:'1px solid var(--border-soft)', borderRadius: 6, padding: 16, display:'flex', flexDirection:'column', overflow:'hidden' }}>
              <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 4 }}>
                <span className="wa-mono" style={{ fontSize: 20, fontWeight: 600, color: `var(--${g.tone})` }}>{g.items.length}</span>
                <h3 className="wa-display" style={{ fontSize: 18, margin: 0, fontWeight: 500 }}>{g.title}</h3>
              </div>
              <p style={{ fontSize: 11.5, color:'var(--ink-2)', marginBottom: 14 }}>{g.hint}</p>
              <div style={{ display:'grid', gap: 6, overflowY:'auto', paddingRight: 4 }}>
                {g.items.map(a => {
                  const p = WA_PERSON(a.who);
                  return (
                    <div key={a.id} className="wa-activity" style={{ padding:'10px 12px', position:'relative' }}>
                      <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 6 }}>
                        <Avatar person={p} size="sm" />
                        <span style={{ fontSize: 11, color:'var(--muted)' }}>{p.name.split(' ')[0]}</span>
                        <EffortPill a={a} size="sm" />
                        {a.flagged ? <span style={{ color:'var(--flag)', fontSize: 12, marginLeft:'auto' }}>★</span> : null}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3, marginBottom: 6 }}>{a.t}</div>
                      <div style={{ display:'flex', gap: 3, flexWrap:'wrap', alignItems:'center' }}>
                        <span className={`wa-chip ${TPO_TONE[a.tpo]}`} style={{ padding:'2px 5px', fontSize: 10 }}>{TPO_SHORT[a.tpo]}</span>
                        <span className={`wa-chip ${FREQ_TONE[a.freq]}`} style={{ padding:'2px 5px', fontSize: 10 }}>{FREQ_SHORT[a.freq]}</span>
                        <span className={`wa-chip ${ENERGY_TONE[a.energy]}`} style={{ padding:'2px 5px', fontSize: 10 }}>{ENERGY_SHORT[a.energy]}</span>
                        <span style={{ marginLeft:'auto' }}><FacActions size="sm" /></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <ArtboardFooter idx="09" label="FACILITATOR · GROUPED" />
    </div>
  );
}

// ---- 10 · Discussion mode — the active classify + flag UX ----
function FacilitatorDiscussion() {
  // Pretend we're mid-discussion: first 12 activities classified, last 6 are pending
  const PROGRESS = 12;
  const classified = WA_ACTIVITIES.slice(0, PROGRESS);
  const pending = WA_ACTIVITIES.slice(PROGRESS).map(a => ({ ...a, team_auto: 'unclassified' }));
  const focusActivity = pending[0]; // "Architecture diagrams..." per data order — but let's pick a juicy one
  const flagged = WA_ACTIVITIES.filter(a => a.flagged);

  return (
    <div className="wa-screen" style={{ background:'var(--paper)' }}>
      <FacilitatorBar active="discuss" count={WA_ACTIVITIES.length} flagged={flagged.length} classified={PROGRESS} />

      <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', height:'calc(100% - 53px)' }}>
        <main style={{ padding:'22px 28px', background:'var(--cream)', overflow:'hidden', position:'relative', display:'flex', flexDirection:'column' }}>
          <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom: 10 }}>
            <div>
              <Eyebrow color="var(--rust)">Discussion · tagging automatability + flagging priorities</Eyebrow>
              <h2 className="wa-display" style={{ fontSize: 22, margin:'4px 0 0', fontWeight: 500 }}>
                Walk each activity. Decide automatable together.
              </h2>
            </div>
            <div style={{ display:'flex', gap: 10, alignItems:'center' }}>
              <span className="wa-tick">↳ {PROGRESS} / {WA_ACTIVITIES.length} classified</span>
              <div style={{ width: 120, height: 6, background:'var(--paper-deep)', borderRadius: 3, overflow:'hidden' }}>
                <div style={{ width: `${(PROGRESS / WA_ACTIVITIES.length) * 100}%`, height:'100%', background:'var(--ink)' }} />
              </div>
            </div>
          </div>

          {/* Matrix — placed dots + a "needs review" tray below */}
          <div style={{ flex: 1, position:'relative', background:'#fff', border:'1px solid var(--rule)', borderRadius: 6, padding:'40px 36px 36px 48px', marginBottom: 12, minHeight: 0 }}>
            <div style={{ position:'absolute', top: 40, bottom: 36, left: 48, right: 36 }}>
              <div style={{ position:'absolute', inset: 0, borderRadius: 3, overflow:'hidden' }}>
                <div style={{ position:'absolute', top:0, right:0, width:'50%', height:'50%', background:'var(--rust-bg)', opacity:0.45 }} />
                <div style={{ position:'absolute', bottom:0, left:0, width:'50%', height:'50%', background:'var(--sage-bg)', opacity:0.3 }} />
              </div>
              <div style={{ position:'absolute', top:0, bottom:0, left:'50%', borderLeft:'1px dashed var(--border-soft)' }} />
              <div style={{ position:'absolute', left:0, right:0, top:'50%', borderTop:'1px dashed var(--border-soft)' }} />
              <span className="wa-quad-label" style={{ top: 8, right: 10, color:'var(--rust)', fontWeight: 600 }}>↗ PRIORITY · {flagged.length} flagged</span>
              <span className="wa-quad-label" style={{ top: 8, left: 10 }}>↖ Tolerable</span>
              <span className="wa-quad-label" style={{ bottom: 8, right: 10 }}>↘ Strategic</span>
              <span className="wa-quad-label" style={{ bottom: 8, left: 10, color:'#3b4a2b' }}>↙ Healthy</span>
              {classified.map(a => {
                const { x, y } = matrixCoords(a);
                return <MatrixDot key={a.id} a={a} x={x} y={y} size={a.flagged ? 32 : 26} />;
              })}
            </div>
            <div className="wa-mono" style={{ position:'absolute', bottom: 12, left:'50%', transform:'translateX(-50%)', fontSize: 9, color:'var(--muted-2)' }}>
              ← LOW EFFORT · h/wk · HIGH EFFORT →
            </div>
            <div className="wa-mono" style={{ position:'absolute', left: 12, top:'50%', transform:'rotate(-90deg)', transformOrigin:'left center', fontSize: 9, color:'var(--muted-2)' }}>
              ← ENERGIZING · DRAINING →
            </div>
          </div>

          {/* Pending tray */}
          <div style={{ background:'var(--paper-deep)', border:'1px dashed var(--rust)', borderRadius: 6, padding:'10px 14px', flexShrink: 0 }}>
            <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom: 8 }}>
              <div className="wa-eyebrow" style={{ color:'var(--rust)' }}>↳ Needs classification ({pending.length})</div>
              <span className="wa-mono" style={{ fontSize: 10, color:'var(--muted)' }}>activities below haven't been placed yet</span>
            </div>
            <div style={{ display:'flex', gap: 6, flexWrap:'wrap' }}>
              {pending.map((a, i) => {
                const p = WA_PERSON(a.who);
                const active = i === 0;
                return (
                  <div key={a.id} style={{
                    padding:'6px 9px', background: active ? 'var(--ink)' : '#fff',
                    color: active ? 'var(--cream)' : 'var(--ink-2)',
                    border:'1px solid ' + (active ? 'var(--ink)' : 'var(--rule)'),
                    borderRadius: 14, fontSize: 11, display:'inline-flex', alignItems:'center', gap: 6,
                    cursor:'pointer',
                  }}>
                    <span className="wa-avatar is-sm" style={{ background: p.color, color:'#fff', width: 14, height: 14, fontSize: 8 }}>{p.initials}</span>
                    <span style={{ whiteSpace:'nowrap', maxWidth: 180, overflow:'hidden', textOverflow:'ellipsis' }}>{a.t}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </main>

        {/* Right rail — Now reviewing */}
        <aside style={{ borderLeft:'1px solid var(--rule)', background:'var(--paper)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ padding:'18px 20px 14px', borderBottom:'1px solid var(--border-soft)' }}>
            <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom: 4 }}>
              <Eyebrow color="var(--rust)">↳ Now reviewing · {PROGRESS + 1} / {WA_ACTIVITIES.length}</Eyebrow>
              <span className="wa-mono" style={{ fontSize: 10, color:'var(--muted)' }}>k / j to move</span>
            </div>
            <h3 className="wa-display" style={{ fontSize: 19, margin:'6px 0 10px', fontWeight: 500, lineHeight: 1.25 }}>
              {focusActivity.t}
            </h3>
            <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 10 }}>
              <Avatar person={WA_PERSON(focusActivity.who)} size="sm" />
              <span style={{ fontSize: 12 }}>{WA_PERSON(focusActivity.who).name}</span>
              <EffortPill a={focusActivity} />
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap: 4, alignItems:'center' }}>
              <span className={`wa-chip ${TPO_TONE[focusActivity.tpo]}`}>{TPO_SHORT[focusActivity.tpo]}</span>
              <span className={`wa-chip ${FREQ_TONE[focusActivity.freq]}`}>{FREQ_SHORT[focusActivity.freq]}</span>
              <span className={`wa-chip ${ENERGY_TONE[focusActivity.energy]}`}>{ENERGY_SHORT[focusActivity.energy]}</span>
              <span style={{ marginLeft:'auto' }}><FacActions size="sm" /></span>
            </div>
          </div>

          <div style={{ padding:'18px 20px', borderBottom:'1px solid var(--border-soft)' }}>
            <div className="wa-eyebrow" style={{ marginBottom: 10 }}>↳ Team verdict · automatable?</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap: 6, marginBottom: 10 }}>
              <ClassifyBtn label="Yes"   sub="clearly" tone="rust"  />
              <ClassifyBtn label="Maybe" sub="partial" tone="amber" />
              <ClassifyBtn label="No"    sub="needs judgement" tone="" />
            </div>
            <div className="wa-mono" style={{ fontSize: 10, color:'var(--muted-2)' }}>↳ shortcut · 1 / 2 / 3</div>
          </div>

          <div style={{ padding:'18px 20px', borderBottom:'1px solid var(--border-soft)' }}>
            <div className="wa-eyebrow" style={{ marginBottom: 8 }}>↳ Flag this for next quarter?</div>
            <button className="wa-btn is-rust" style={{ width:'100%', justifyContent:'center' }}>
              ★ Flag this activity
            </button>
            <input
              className="wa-input"
              style={{ marginTop: 8, fontSize: 12, padding:'8px 10px', background:'var(--paper)' }}
              placeholder="Optional discussion note · who'll own it…"
              readOnly
            />
          </div>

          <div style={{ flex: 1, overflowY:'auto', padding:'14px 16px' }}>
            <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom: 8 }}>
              <Eyebrow>★ Flagged so far</Eyebrow>
              <span className="wa-mono" style={{ fontSize: 11, color:'var(--muted)' }}>{flagged.length}</span>
            </div>
            <div style={{ display:'grid', gap: 6 }}>
              {flagged.map((a, i) => {
                const p = WA_PERSON(a.who);
                return (
                  <div key={a.id} style={{ background:'#fff', borderLeft:'3px solid var(--rust)', border:'1px solid var(--rust-bg)', borderRadius: 4, padding:'8px 10px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap: 6, marginBottom: 4 }}>
                      <span className="wa-mono" style={{ fontSize: 10, color:'var(--muted-2)' }}>{String(i+1).padStart(2,'0')}</span>
                      <Avatar person={p} size="sm" />
                      <span style={{ fontSize: 11, color:'var(--muted)' }}>{p.name.split(' ')[0]}</span>
                      <span style={{ color:'var(--flag)', marginLeft:'auto', fontSize: 11 }}>★</span>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.3 }}>{a.t}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ padding: 14, borderTop:'1px solid var(--border-soft)', display:'flex', gap: 8 }}>
            <button className="wa-btn is-ghost" style={{ flex: 1, justifyContent:'center', padding:'8px' }}>← Prev</button>
            <button className="wa-btn" style={{ flex: 2, justifyContent:'center', padding:'8px' }}>Skip · next →</button>
          </div>
        </aside>
      </div>

      <ArtboardFooter idx="10" label="FACILITATOR · DISCUSS · CLASSIFY" />
    </div>
  );
}

function ClassifyBtn({ label, sub, tone }) {
  const bg = tone === 'rust' ? 'var(--rust-bg)' : tone === 'amber' ? 'var(--amber-bg)' : '#fff';
  const fg = tone === 'rust' ? '#6a2810' : tone === 'amber' ? '#6f4318' : 'var(--ink)';
  const bd = tone === 'rust' ? '#e8c8b8' : tone === 'amber' ? '#e8d2a8' : 'var(--rule)';
  return (
    <button style={{
      background: bg, color: fg, border: `1px solid ${bd}`,
      borderRadius: 4, padding:'10px 8px', cursor:'pointer',
      display:'flex', flexDirection:'column', alignItems:'center', gap: 2,
      fontFamily:'var(--font-body)',
    }}>
      <span style={{ fontSize: 14, fontWeight: 600 }}>{label}</span>
      <span className="wa-mono" style={{ fontSize: 10, opacity: 0.75 }}>{sub}</span>
    </button>
  );
}

// ---- 11 · Export modal ----
function FacilitatorExport() {
  return (
    <div className="wa-screen" style={{ background:'var(--paper)', position:'relative' }}>
      <div style={{ position:'absolute', inset: 0, filter:'blur(1px)', opacity: 0.4 }}>
        <FacilitatorDiscussion />
      </div>
      <div style={{ position:'absolute', inset: 0, background:'rgba(28,26,22,0.45)' }} />

      <div style={{
        position:'absolute', top:'50%', left:'50%', transform:'translate(-50%, -50%)',
        width: 860, maxHeight:'88%', background:'var(--cream)',
        borderRadius: 8, boxShadow:'0 24px 80px rgba(0,0,0,0.32)',
        border:'1px solid var(--rule)', overflow:'hidden',
        display:'flex', flexDirection:'column',
      }}>
        <div style={{ padding:'18px 24px', borderBottom:'1px solid var(--border-soft)', display:'flex', alignItems:'center', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <Eyebrow>Export · session output</Eyebrow>
            <h2 className="wa-display" style={{ fontSize: 22, margin:'4px 0 0', fontWeight: 500 }}>Take the priorities with you</h2>
          </div>
          <div className="wa-tabs">
            <button className="is-on">Markdown</button>
            <button>CSV</button>
            <button>Send via MCP</button>
          </div>
          <button style={{ background:'transparent', border:0, fontSize: 20, color:'var(--muted)', cursor:'pointer', padding: 4 }}>×</button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 240px', flex: 1, overflow:'hidden' }}>
          <div style={{ overflowY:'auto', padding:'20px 24px', background:'#fff', borderRight:'1px solid var(--border-soft)' }}>
            <div className="wa-mono" style={{ fontSize: 12, lineHeight: 1.65, color:'var(--ink)', whiteSpace:'pre-wrap' }}>
{`# Work Audit · Platform team · Q2 2026
Facilitator: Devon Okafor · 18 May 2026 · 6 engineers · 18 activities

## ★ Flagged priorities (4)

1. **Triage Sentry alerts each morning** — Sarah Lim
   - Time: 30 min – 2 hrs · Cadence: daily · Energy: drains
   - Team verdict: automatable
   - Note: Auto-group Postgres duplicates first · Sarah to scope

2. **Manual DB backup before deploys** — Sarah Lim
   - Time: < 30 min · Cadence: weekly · Energy: drains
   - Team verdict: automatable
   - Note: Wrap in CI step · 1-day project

3. **Drafting release notes** — Marco Reyes
   - Time: 30 min – 2 hrs · Cadence: weekly · Energy: neutral
   - Team verdict: automatable

4. **Slack DM triage of "quick questions"** — Nadia Voss
   - Time: 30 min – 2 hrs · Cadence: daily · Energy: drains
   - Team verdict: maybe automatable

## All 18 activities by team verdict
### Automatable (5)
- Triage Sentry alerts · Sarah · daily · drains ★
- Manual DB backup · Sarah · weekly · drains ★
- Drafting release notes · Marco · weekly · neutral ★
- Renew SSL certs · Jess · quarterly · drains ★
- Promoting feature flags · Nadia · daily · neutral

### Maybe (4)
- On-call Sunday handoff · Marco · weekly · drains
- Escalating customer tickets · Marco · weekly · drains
- Update on-call runbook · Jess · monthly · neutral
- Slack DM triage · Nadia · daily · drains ★
…
`}
            </div>
          </div>

          <aside style={{ padding:'20px 18px', background:'var(--paper)', display:'flex', flexDirection:'column', gap: 14 }}>
            <div>
              <Eyebrow>Includes</Eyebrow>
              <div style={{ display:'grid', gap: 6, marginTop: 8 }}>
                {[
                  ['Flagged priorities',        true],
                  ['All 18 activities',         true],
                  ['Discussion notes',          true],
                  ['Team verdict (auto)',       true],
                  ['Effort per item (~h/wk)',   true],
                  ['Author attribution',        true],
                ].map(([label, on], i) => (
                  <label key={i} style={{ display:'flex', alignItems:'center', gap: 8, fontSize: 12.5 }}>
                    <span style={{ width: 14, height: 14, borderRadius: 3, background: on ? 'var(--ink)' : '#fff', border:'1px solid var(--rule)', display:'inline-flex', alignItems:'center', justifyContent:'center', color:'var(--cream)', fontSize: 10 }}>
                      {on ? '✓' : ''}
                    </span>
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ background:'#fff', border:'1px dashed var(--rule)', borderRadius: 4, padding:'10px 12px', fontSize: 11, color:'var(--ink-2)', lineHeight: 1.5 }}>
              <div className="wa-mono" style={{ fontSize: 10, color:'var(--muted)', marginBottom: 4 }}>↳ TEAM VERDICT</div>
              Automatability was tagged during the discussion phase — team consensus, not self-report.
            </div>

            <hr className="wa-rule" />

            <div>
              <Eyebrow>Filename</Eyebrow>
              <input className="wa-input" style={{ fontSize: 12, padding:'7px 9px', marginTop: 6 }} value="platform-q2-audit.md" readOnly />
            </div>

            <div style={{ marginTop:'auto', display:'grid', gap: 8 }}>
              <button className="wa-btn" style={{ justifyContent:'center' }}>Copy to clipboard</button>
              <button className="wa-btn is-ghost" style={{ justifyContent:'center' }}>Download .md</button>
              <div className="wa-mono" style={{ fontSize: 10, color:'var(--muted-2)', textAlign:'center', marginTop: 4 }}>
                ↳ MCP connector detected · "Send to my notes"
              </div>
            </div>
          </aside>
        </div>
      </div>

      <ArtboardFooter idx="11" label="FACILITATOR · EXPORT" />
    </div>
  );
}

window.FacilitatorLive = FacilitatorLive;
window.FacilitatorMatrix = FacilitatorMatrix;
window.FacilitatorGrouped = FacilitatorGrouped;
window.FacilitatorDiscussion = FacilitatorDiscussion;
window.FacilitatorExport = FacilitatorExport;
