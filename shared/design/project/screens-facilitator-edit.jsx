// 10B · Facilitator action: Edit any activity card
// Triggered by ✎ edit on any activity. Lets the facilitator amend title,
// re-tag the three questions, change the team verdict, add a note, or remove.

function FacilitatorEdit() {
  // Pick Sarah's Sentry triage card — same one as Matrix detail focus
  const a = WA_ACTIVITIES[0];
  const person = WA_PERSON(a.who);

  return (
    <div className="wa-screen" style={{ background:'var(--paper)', position:'relative' }}>
      {/* Behind: matrix view, dimmed */}
      <div style={{ position:'absolute', inset: 0, filter:'blur(1px)', opacity: 0.35 }}>
        <FacilitatorMatrix />
      </div>
      <div style={{ position:'absolute', inset: 0, background:'rgba(28,26,22,0.42)' }} />

      <div style={{
        position:'absolute', top:'50%', left:'50%', transform:'translate(-50%, -50%)',
        width: 760, maxHeight:'92%', background:'var(--cream)',
        borderRadius: 8, boxShadow:'0 24px 80px rgba(0,0,0,0.32)',
        border:'1px solid var(--rule)', overflow:'hidden',
        display:'flex', flexDirection:'column',
      }}>
        {/* Header */}
        <div style={{ padding:'16px 22px', borderBottom:'1px solid var(--border-soft)', display:'flex', alignItems:'center', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <Eyebrow color="var(--rust)">↳ Facilitator action · edit activity</Eyebrow>
            <h2 className="wa-display" style={{ fontSize: 20, margin:'4px 0 0', fontWeight: 500 }}>
              Editing on behalf of {person.name.split(' ')[0]}
            </h2>
          </div>
          <button style={{ background:'transparent', border:0, fontSize: 20, color:'var(--muted)', cursor:'pointer', padding: 4 }}>×</button>
        </div>

        {/* Original card preview (collapsed) */}
        <div style={{ padding:'12px 22px', borderBottom:'1px solid var(--border-soft)', background:'var(--paper)', display:'flex', alignItems:'center', gap: 12 }}>
          <Avatar person={person} size="sm" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="wa-mono" style={{ fontSize: 10, color:'var(--muted-2)', letterSpacing:'0.06em' }}>↳ ORIGINAL · {person.name} · submitted 17 min ago</div>
            <div style={{ fontSize: 12.5, color:'var(--ink-2)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>"{a.t}"</div>
          </div>
          <EffortPill a={a} size="sm" />
        </div>

        <div style={{ padding:'20px 22px', overflowY:'auto', flex: 1 }}>
          {/* Title field */}
          <label className="wa-label">Activity</label>
          <input className="wa-input" style={{ fontSize: 16, padding:'11px 14px', marginBottom: 6 }}
                 value="Triage Sentry alerts each morning" readOnly />
          <div className="wa-mono" style={{ fontSize: 10.5, color:'var(--muted-2)', marginBottom: 18, letterSpacing:'0.04em' }}>
            ↳ changes are visible to the original author with an "edited by Devon" footnote
          </div>

          {/* Three questions */}
          <EditQuestionBlock
            label="Time per occurrence"
            options={[['<30m','< 30 min'],['30m-2h','30 min – 2 hrs'],['half-day','Half day'],['day+','A full day or more']]}
            value={a.tpo}
            tone="time"
          />
          <EditQuestionBlock
            label="How often"
            options={[['daily','Daily'],['weekly','Weekly'],['monthly','Monthly'],['quarterly','Quarterly'],['adhoc','Ad hoc']]}
            value={a.freq}
            tone="freq"
          />
          <EditQuestionBlock
            label="Energy"
            options={[['energizing','Energizes'],['neutral','Neutral'],['draining','Drains']]}
            value={a.energy}
            tone="energy"
          />

          <hr className="wa-rule" style={{ margin:'18px 0' }} />

          {/* Team verdict (only editable post-classification) */}
          <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom: 6 }}>
            <label className="wa-label" style={{ margin: 0 }}>Team verdict · automatability</label>
            <span className="wa-mono" style={{ fontSize: 10, color:'var(--muted-2)' }}>set during discussion</span>
          </div>
          <div style={{ display:'flex', gap: 6, marginBottom: 18 }}>
            {[
              ['yes',   'Automatable',     'rust'],
              ['maybe', 'Maybe',           'amber'],
              ['no',    'Manual forever',  ''],
            ].map(([v, label, t]) => {
              const on = v === a.team_auto;
              return (
                <button key={v} style={{
                  flex: 1, padding:'9px 8px',
                  background: on ? (t === 'rust' ? 'var(--rust)' : t === 'amber' ? 'var(--amber)' : 'var(--ink)') : '#fff',
                  color: on ? '#fff' : 'var(--ink-2)',
                  border:'1px solid ' + (on ? 'transparent' : 'var(--rule)'),
                  borderRadius: 4, cursor:'pointer', fontWeight: on ? 600 : 500, fontSize: 12.5,
                }}>{label}</button>
              );
            })}
          </div>

          {/* Notes */}
          <label className="wa-label">Discussion note (optional)</label>
          <textarea
            className="wa-input"
            style={{ minHeight: 64, fontFamily:'var(--font-body)', fontSize: 13, lineHeight: 1.5, resize:'vertical' }}
            readOnly
            value="Most alerts are duplicates of three Postgres flakes. Auto-group before they hit Sarah." />

          {/* Flag */}
          <div style={{ marginTop: 16, padding:'12px 14px', background:'var(--rust-bg)', border:'1px solid #e8c8b8', borderRadius: 4, display:'flex', alignItems:'center', gap: 12 }}>
            <span style={{ color:'var(--flag)', fontSize: 16 }}>★</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color:'#6a2810' }}>Flagged for next quarter</div>
              <div style={{ fontSize: 11.5, color:'#6a2810', opacity: 0.85 }}>Will appear in the priority export</div>
            </div>
            <button className="wa-btn is-ghost" style={{ padding:'5px 10px', fontSize: 11.5, borderColor:'#e8c8b8' }}>Unflag</button>
          </div>

          {/* Audit trail */}
          <details style={{ marginTop: 14, fontSize: 12, color:'var(--muted)' }}>
            <summary style={{ cursor:'pointer', listStyle:'none', display:'flex', alignItems:'center', gap: 6 }}>
              <span className="wa-mono" style={{ fontSize: 10, color:'var(--muted-2)', letterSpacing:'0.06em' }}>↳ EDIT HISTORY · 2 PRIOR CHANGES</span>
              <span style={{ fontSize: 10, color:'var(--muted-2)' }}>▾</span>
            </summary>
            <div style={{ marginTop: 8, padding:'10px 12px', background:'var(--paper)', border:'1px solid var(--border-soft)', borderRadius: 4 }}>
              <div className="wa-mono" style={{ fontSize: 11, color:'var(--ink-2)', lineHeight: 1.7 }}>
                <div><span style={{ color:'var(--muted-2)' }}>14:32 · Sarah</span> created the card</div>
                <div><span style={{ color:'var(--muted-2)' }}>14:48 · Devon</span> tagged team verdict → automatable</div>
                <div><span style={{ color:'var(--muted-2)' }}>14:51 · Devon</span> flagged for next quarter</div>
              </div>
            </div>
          </details>
        </div>

        {/* Footer */}
        <div style={{ padding:'14px 22px', borderTop:'1px solid var(--border-soft)', display:'flex', gap: 10, alignItems:'center' }}>
          <button className="wa-btn is-ghost" style={{ padding:'8px 14px', fontSize: 13, color:'var(--rust)', borderColor:'#e8c8b8' }}>
            × Remove activity
          </button>
          <span style={{ flex: 1 }} />
          <button className="wa-btn is-ghost" style={{ padding:'8px 14px', fontSize: 13 }}>Cancel</button>
          <button className="wa-btn">Save changes</button>
        </div>
      </div>

      <ArtboardFooter idx="10B" label="FACILITATOR · EDIT (ACTION)" />
    </div>
  );
}

// Segmented question block — keeps the same on-dark-ink selected style as engineer view,
// so the visual model "you're amending the original answer" is obvious.
function EditQuestionBlock({ label, options, value, tone }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label className="wa-label">{label}</label>
      <div style={{ display:'flex', gap: 6 }}>
        {options.map(([v, lbl]) => {
          const on = v === value;
          return (
            <button key={v} style={{
              flex: 1, padding:'9px 10px',
              background: on ? 'var(--ink)' : '#fff',
              color: on ? 'var(--cream)' : 'var(--ink)',
              border:'1px solid ' + (on ? 'var(--ink)' : 'var(--rule)'),
              borderRadius: 4, cursor:'pointer', fontWeight: on ? 500 : 400, fontSize: 12.5,
              minWidth: 0,
            }}>
              {lbl}
            </button>
          );
        })}
      </div>
    </div>
  );
}

window.FacilitatorEdit = FacilitatorEdit;
