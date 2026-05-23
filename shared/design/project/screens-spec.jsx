// Spec brief — the design rationale that opens the canvas.

function SpecBrief() {
  return (
    <div className="wa-screen" style={{ padding: '56px 64px', overflow: 'hidden' }}>
      <div style={{ display:'flex', alignItems:'baseline', gap: 14, marginBottom: 28 }}>
        <span className="wa-eyebrow">Brief · v0.3 · matrix reframed</span>
        <span style={{ flex:1, height:1, background:'var(--rule)' }} />
        <span className="wa-eyebrow">May 18 · 2026</span>
      </div>

      <h1 className="wa-display" style={{ fontSize: 56, lineHeight: 1.02, margin: '0 0 12px', letterSpacing:'-0.02em' }}>
        Work Audit
      </h1>
      <p className="wa-display" style={{ fontSize: 22, lineHeight: 1.35, margin: '0 0 28px', color:'var(--muted)', fontStyle:'italic', maxWidth: 620 }}>
        A single-session tool that replaces one quarterly retro &mdash; aimed at the question{' '}
        <span style={{color:'var(--ink)', fontStyle:'normal'}}>"what work are we doing, and should we still be doing it that way?"</span>
      </p>

      {/* v3 changes callout */}
      <div style={{ background: 'var(--rust-bg)', border:'1px solid #e8c8b8', borderRadius: 6, padding:'14px 18px', marginBottom: 28, display:'flex', gap: 16 }}>
        <div style={{ fontFamily:'var(--font-mono)', fontSize: 11, color:'#6a2810', letterSpacing:'0.06em', fontWeight: 600, flexShrink: 0, paddingTop: 2 }}>
          v0.3&nbsp;CHANGES
        </div>
        <div style={{ fontSize: 13, color:'#3a2a20', lineHeight: 1.55 }}>
          Matrix rebuilt around the team's experience, not automation:&nbsp;
          <strong>Y = energy</strong> (drains↑ / energizes↓),&nbsp;
          <strong>X = effort</strong> (low → high, shown as <em>~h/wk</em>).
          Automatability is a <strong>secondary layer</strong> — colors the dots, filters the view, but isn't an axis.
          Every card now shows a unified <strong>~h/wk velocity</strong> number so daily-30min and weekly-half-day land near each other.
          Submission window is soft &amp; adjustable mid-session. Engineer roles: IC (default) · EM · PM · UX · Other.
        </div>
      </div>

      {/* v0.2 reference (rolled up) */}
      <div style={{ display:'flex', gap: 14, padding:'10px 14px', background:'var(--paper)', border:'1px solid var(--border-soft)', borderRadius: 4, marginBottom: 32, fontSize: 12, color:'var(--muted)', alignItems:'baseline' }}>
        <span className="wa-mono" style={{ fontSize: 10, color:'var(--muted-2)', letterSpacing:'0.06em' }}>v0.2 RECAP</span>
        <span>3 engineer questions (time / freq / energy) · automatability classified together in discussion.</span>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 40 }}>
        {/* LEFT column */}
        <div>
          <div style={{ marginBottom: 28 }}>
            <div className="wa-eyebrow" style={{ marginBottom: 10 }}>01 · The flow</div>
            <ol style={{ margin: 0, padding: 0, listStyle:'none', display:'grid', gap: 8 }}>
              {[
                ['Facilitator', 'creates a session, shares the join link'],
                ['Engineers',   'join via link — no login, just a name'],
                ['Everyone',    'spends ~10 min listing recurring activities'],
                ['Each card',   'is tagged with 3 questions (time / frequency / energy)'],
                ['Facilitator', 'closes submissions, opens discussion'],
                ['Team',        'walks through activities, classifies automatability together'],
                ['Facilitator', 'flags priorities as discussion happens'],
                ['Output',      'is a Markdown export (or grab via MCP)'],
              ].map(([who, what], i) => (
                <li key={i} style={{ display:'grid', gridTemplateColumns:'24px 88px 1fr', gap: 8, alignItems:'baseline' }}>
                  <span className="wa-num">{String(i+1).padStart(2,'0')}</span>
                  <span style={{ fontWeight: 500 }}>{who}</span>
                  <span style={{ color:'var(--ink-2)' }}>{what}</span>
                </li>
              ))}
            </ol>
          </div>

          <div style={{ marginBottom: 28 }}>
            <div className="wa-eyebrow" style={{ marginBottom: 10 }}>02 · Engineer-submitted (3 questions)</div>
            <div style={{ display:'grid', gap: 8 }}>
              <QRow num="01" q="Time per occurrence"
                    opts="< 30 min · 30 min – 2 hrs · ½ day · 1+ days"
                    why="concrete units, gut-honest"/>
              <QRow num="02" q="How often?"
                    opts="Daily · Weekly · Monthly · Quarterly · Ad hoc"
                    why="named cadences, not abstract repetitiveness"/>
              <QRow num="03" q="Energy"
                    opts="Energizes me · Neutral · Drains me"
                    why="emotional cost — see 04 below for alternatives"/>
            </div>
          </div>

          <div>
            <div className="wa-eyebrow" style={{ marginBottom: 10 }}>03 · Team-classified during discussion</div>
            <div style={{ background:'#fff', border:'1px solid var(--border-soft)', borderLeft:'3px solid var(--rust)', borderRadius: 4, padding:'12px 14px' }}>
              <div style={{ display:'flex', alignItems:'baseline', gap: 10, marginBottom: 4 }}>
                <span className="wa-mono" style={{ fontSize: 10, color:'var(--muted-2)' }}>04</span>
                <span style={{ fontWeight: 500 }}>Is it automatable / removable?</span>
              </div>
              <div className="wa-mono" style={{ fontSize: 12, color:'var(--ink-2)', marginBottom: 4 }}>Yes · Maybe · No</div>
              <div style={{ fontSize: 12, color:'var(--muted)', fontStyle:'italic' }}>
                Asked once per activity during discussion — facilitator clicks, team decides together. Catches the cases an engineer can't see alone.
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT column */}
        <div>
          <div style={{ marginBottom: 24 }}>
            <div className="wa-eyebrow" style={{ marginBottom: 10 }}>04 · The matrix (rebuilt)</div>
            <div style={{ background:'#fff', border:'1px solid var(--border-soft)', borderRadius: 4, padding: 14, marginBottom: 10 }}>
              {/* Tiny illustration of the matrix */}
              <div style={{ position:'relative', aspectRatio:'1.4 / 1', background:'var(--paper)', border:'1px solid var(--border-soft)', borderRadius: 4, marginBottom: 10 }}>
                <div style={{ position:'absolute', top:0, bottom:0, left:'50%', borderLeft:'1px dashed var(--rule)' }} />
                <div style={{ position:'absolute', left:0, right:0, top:'50%', borderTop:'1px dashed var(--rule)' }} />
                <div style={{ position:'absolute', top:0, right:0, width:'50%', height:'50%', background:'var(--rust-bg)', opacity: 0.55 }} />
                <span className="wa-mono" style={{ position:'absolute', top: 6, right: 8, fontSize: 9, color:'var(--rust)', fontWeight: 600, letterSpacing:'0.06em' }}>↗ PRIORITY</span>
                <span className="wa-mono" style={{ position:'absolute', top: 6, left: 8, fontSize: 9, color:'var(--muted-2)', letterSpacing:'0.06em' }}>↖ tolerable</span>
                <span className="wa-mono" style={{ position:'absolute', bottom: 6, right: 8, fontSize: 9, color:'var(--muted-2)', letterSpacing:'0.06em' }}>↘ celebrate</span>
                <span className="wa-mono" style={{ position:'absolute', bottom: 6, left: 8, fontSize: 9, color:'var(--muted-2)', letterSpacing:'0.06em' }}>↙ healthy</span>
                <span className="wa-mono" style={{ position:'absolute', bottom: -2, left:'50%', transform:'translateX(-50%) translateY(100%)', fontSize: 9, color:'var(--muted)', letterSpacing:'0.08em' }}>EFFORT (h/wk) →</span>
                <span className="wa-mono" style={{ position:'absolute', top:'50%', left: -4, transform:'translateX(-100%) rotate(-90deg)', transformOrigin:'right center', fontSize: 9, color:'var(--muted)', letterSpacing:'0.08em' }}>DRAINS →</span>
                {/* Sample dots */}
                {[
                  { x: 75, y: 18, c: 'rust' },
                  { x: 88, y: 28, c: 'rust' },
                  { x: 60, y: 22, c: 'amber' },
                  { x: 25, y: 35, c: 'amber' },
                  { x: 30, y: 78, c: 'sage' },
                  { x: 50, y: 70, c: 'sage' },
                  { x: 70, y: 80, c: 'slate' },
                ].map((d, i) => (
                  <div key={i} style={{ position:'absolute', left:`${d.x}%`, top:`${d.y}%`, width: 9, height: 9, borderRadius:'50%',
                    background: `var(--${d.c})`, transform:'translate(-50%, -50%)' }} />
                ))}
              </div>
              <div style={{ fontSize: 12, color:'var(--ink-2)', lineHeight: 1.55 }}>
                <strong>Y</strong> = energy (drain top, energize bottom)&nbsp;·&nbsp;
                <strong>X</strong> = effort, ~h/wk&nbsp;·&nbsp;
                <strong>dot colour</strong> = team verdict on automatability.
              </div>
            </div>
            <p style={{ fontSize: 12, color:'var(--muted)', margin: 0, fontStyle:'italic', lineHeight: 1.55 }}>
              Top-right = "drains the team and eats their week" — the work to fix or remove.
              Bottom-half = energizing work; protect or even scale up. Automatability becomes
              the <em>how</em>, not the axis.
            </p>
          </div>

          <div style={{ marginBottom: 22 }}>
            <div className="wa-eyebrow" style={{ marginBottom: 10 }}>05 · Effort = ~h/wk (unified velocity)</div>
            <p style={{ fontSize: 13, color:'var(--ink-2)', lineHeight: 1.5, margin:'0 0 10px' }}>
              Cards show one headline number: roughly hours/week. Lets you compare across cadences.
            </p>
            <div className="wa-mono" style={{ fontSize: 11.5, color:'var(--ink-2)', lineHeight: 1.7, background:'#fff', border:'1px solid var(--border-soft)', borderRadius: 4, padding:'10px 12px' }}>
              <div>30m daily &nbsp;&nbsp;→&nbsp; ~2.5 h/wk</div>
              <div>30m–2h weekly &nbsp;→&nbsp; ~1 h/wk</div>
              <div>half-day quarterly &nbsp;→&nbsp; ~0.3 h/wk</div>
              <div>day+ monthly &nbsp;→&nbsp; ~2 h/wk</div>
            </div>
          </div>

          <div>
            <div className="wa-eyebrow" style={{ marginBottom: 10 }}>06 · Other v0.3 decisions</div>
            <div style={{ display:'grid', gap: 10 }}>
              <Decision k="Submission window is soft"
                v="The duration the facilitator picks is a hint, not a lock. They can extend mid-session (+2 min, +5, untimed). Submissions don't auto-close." />
              <Decision k="Late joiners are first-class"
                v="Engineers can join after the round starts and see what's already been logged. No 'sorry, missed the window' state." />
              <Decision k="Suggestions pre-fill title only"
                v="Tapping a teammate's activity as &quot;you might have this too&quot; drafts a card with the title — you still answer the three questions for yourself, because cadence/energy vary by role." />
              <Decision k="Facilitator edits any card, any time"
                v="Edit · merge · remove on every activity card across Live / Matrix / Grouped / Discussion. Useful for fixing typos, merging near-duplicates, and dropping mis-categorised work without bothering the original author." />
              <Decision k="Roles are simple"
                v="IC (default) · EM · PM · UX · Other. Optional — present mostly for downstream filtering, not gatekeeping." />
            </div>
          </div>
        </div>
      </div>

      <div style={{ position:'absolute', bottom: 24, left: 64, right: 64, display:'flex', alignItems:'center', gap: 12 }}>
        <span className="wa-mono" style={{ fontSize: 10, color:'var(--muted-2)', letterSpacing:'0.08em' }}>
          12 ARTBOARDS · 5 SECTIONS · DRAG ARTBOARDS TO REORDER · CLICK ⤢ TO FOCUS
        </span>
        <span style={{ flex:1, height:1, background:'var(--rule)' }} />
        <span className="wa-mono" style={{ fontSize: 10, color:'var(--muted-2)' }}>00 / SPEC</span>
      </div>
    </div>
  );
}

function QRow({ num, q, opts, why }) {
  return (
    <div style={{ padding:'10px 12px', border:'1px solid var(--border-soft)', borderRadius: 4, background:'#fff' }}>
      <div style={{ display:'flex', alignItems:'baseline', gap: 10, marginBottom: 4 }}>
        <span className="wa-mono" style={{ fontSize: 10, color:'var(--muted-2)' }}>{num}</span>
        <span style={{ fontWeight: 500 }}>{q}</span>
      </div>
      <div className="wa-mono" style={{ fontSize: 12, color:'var(--ink-2)', marginBottom: 2 }}>{opts}</div>
      <div style={{ fontSize: 12, color:'var(--muted)', fontStyle:'italic' }}>{why}</div>
    </div>
  );
}

function AltRow({ label, desc, chosen }) {
  return (
    <div style={{
      padding:'8px 10px', borderRadius: 4,
      border: '1px solid ' + (chosen ? '#c8d2b1' : 'var(--border-soft)'),
      background: chosen ? 'var(--sage-bg)' : '#fff',
    }}>
      <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 2 }}>
        <span style={{ fontWeight: 500, color: chosen ? '#3b4a2b' : 'var(--ink)' }}>{label}</span>
        {chosen ? <span className="wa-mono" style={{ fontSize: 10, color: '#3b4a2b', letterSpacing:'0.08em' }}>← CHOSEN</span> : null}
      </div>
      <div style={{ fontSize: 12, color:'var(--ink-2)', lineHeight: 1.5 }}>{desc}</div>
    </div>
  );
}

function Decision({ k, v }) {
  return (
    <div>
      <div style={{ fontWeight: 500, marginBottom: 4, color:'var(--ink)' }}>{k}</div>
      <div style={{ color:'var(--ink-2)', fontSize: 13, lineHeight: 1.5, maxWidth: 540 }} dangerouslySetInnerHTML={{__html: v}} />
    </div>
  );
}

window.SpecBrief = SpecBrief;
