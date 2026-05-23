// 11 · Facilitator action: Merge near-duplicates
// Triggered by ⇄ merge on any activity card. Combines two reports into one canonical
// card, attributes both authors, sums weekly effort, picks a primary energy/cadence.

function FacilitatorMerge() {
  // Source: Marco's "Drafting release notes" (a07)
  const source = WA_ACTIVITIES[6];
  // Synthetic candidates that look like dupes — only the top one is a real overlap.
  // similarity broken into its three components so the math is visible.
  const candidates = [
    { id: 'cand-1', t: 'Write release notes after every deploy', who: 'sa',
      tpo: '<30m', freq: 'weekly', energy: 'neutral',
      sem: 0.91, sameFreq: true, sameTpo: false,
      hint: 'near-identical wording · same cadence' },
    { id: 'cand-2', t: 'Drafting customer-facing changelog',     who: 'pr',
      tpo: '<30m', freq: 'monthly', energy: 'energizing',
      sem: 0.42, sameFreq: false, sameTpo: false,
      hint: 'related — different audience & cadence' },
    { id: 'cand-3', t: 'Updating on-call runbook entries',       who: 'je',
      tpo: '<30m', freq: 'monthly', energy: 'neutral',
      sem: 0.15, sameFreq: false, sameTpo: false,
      hint: 'low overlap — kept for sanity check' },
  ].map(c => ({
    ...c,
    similarity: 0.85 * c.sem + 0.10 * (c.sameFreq ? 1 : 0) + 0.05 * (c.sameTpo ? 1 : 0),
  }));
  const chosen = candidates[0];

  // Computed merged card preview
  const mergedAuthors = [WA_PERSON(source.who), WA_PERSON(chosen.who)];
  const sourceEffort = WA_EFFORT(source).hrs;
  const targetEffort = WA_EFFORT(chosen).hrs;
  const combinedHrs = sourceEffort + targetEffort;
  const combinedDisplay = `~${combinedHrs.toFixed(1)} h/wk combined`;

  return (
    <div className="wa-screen" style={{ background:'var(--paper)', position:'relative' }}>
      {/* Behind: live monitoring, dimmed */}
      <div style={{ position:'absolute', inset: 0, filter:'blur(1px)', opacity: 0.35 }}>
        <FacilitatorLive />
      </div>
      <div style={{ position:'absolute', inset: 0, background:'rgba(28,26,22,0.42)' }} />

      <div style={{
        position:'absolute', top:'50%', left:'50%', transform:'translate(-50%, -50%)',
        width: 880, maxHeight:'92%', background:'var(--cream)',
        borderRadius: 8, boxShadow:'0 24px 80px rgba(0,0,0,0.32)',
        border:'1px solid var(--rule)', overflow:'hidden',
        display:'flex', flexDirection:'column',
      }}>
        {/* Header */}
        <div style={{ padding:'16px 22px', borderBottom:'1px solid var(--border-soft)', display:'flex', alignItems:'center', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <Eyebrow color="var(--rust)">↳ Facilitator action · merge duplicates</Eyebrow>
            <h2 className="wa-display" style={{ fontSize: 22, margin:'4px 0 0', fontWeight: 500 }}>
              Two people reported the same thing — combine them?
            </h2>
          </div>
          <button style={{ background:'transparent', border:0, fontSize: 20, color:'var(--muted)', cursor:'pointer', padding: 4 }}>×</button>
        </div>

        <div style={{ padding:'20px 22px 8px', overflowY:'auto' }}>

          {/* Source card */}
          <div className="wa-eyebrow" style={{ marginBottom: 8 }}>Source · the card you clicked ⇄ on</div>
          <ActivitySummaryCard a={source} />

          {/* Picker */}
          <div className="wa-eyebrow" style={{ marginTop: 18, marginBottom: 8 }}>Merge into…</div>
          <div style={{ position:'relative', marginBottom: 10 }}>
            <input className="wa-input" style={{ paddingLeft: 32, fontSize: 13 }} value="release notes" readOnly />
            <span className="wa-mono" style={{ position:'absolute', left: 12, top:'50%', transform:'translateY(-50%)', fontSize: 12, color:'var(--muted-2)' }}>⌕</span>
          </div>

          <div style={{ display:'grid', gap: 6 }}>
            {candidates.map((c, i) => {
              const p = WA_PERSON(c.who);
              const isOn = c.id === chosen.id;
              const tone = c.similarity > 0.7 ? 'rust' : c.similarity > 0.3 ? 'amber' : 'slate';
              return (
                <div key={c.id} style={{
                  background:'#fff',
                  border: `1px solid ${isOn ? 'var(--rust)' : 'var(--border-soft)'}`,
                  boxShadow: isOn ? '0 0 0 3px rgba(177,77,47,0.12)' : 'none',
                  borderRadius: 4, padding:'10px 12px',
                  display:'flex', alignItems:'center', gap: 10, cursor:'pointer',
                }}>
                  <span style={{ width: 14, height: 14, borderRadius:'50%',
                                 border: `1.5px solid ${isOn ? 'var(--rust)' : 'var(--rule)'}`,
                                 background: isOn ? 'var(--rust)' : '#fff',
                                 display:'inline-flex', alignItems:'center', justifyContent:'center',
                                 color:'#fff', fontSize: 8, flexShrink: 0 }}>
                    {isOn ? '●' : ''}
                  </span>
                  <Avatar person={p} size="sm" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{c.t}</div>
                    <div className="wa-mono" style={{ fontSize: 10.5, color:'var(--muted)' }}>{p.name.split(' ')[0]} · {TPO_SHORT[c.tpo]} · {FREQ_SHORT[c.freq]}</div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink: 0, minWidth: 200 }}>
                    <span className={`wa-chip is-${tone}`} style={{ padding:'2px 7px', fontSize: 10.5, fontWeight: 600 }}>
                      {Math.round(c.similarity * 100)}% match
                    </span>
                    <div className="wa-mono" style={{ fontSize: 9.5, color:'var(--muted-2)', marginTop: 4, letterSpacing:'0.01em' }}>
                      sem {Math.round(c.sem * 100)}
                      {c.sameFreq ? ' · +cadence' : ''}
                      {c.sameTpo ? ' · +duration' : ''}
                    </div>
                    <div className="wa-mono" style={{ fontSize: 10, color:'var(--muted-2)', marginTop: 2 }}>{c.hint}</div>
                  </div>
                </div>
              );
            })}
            <button style={{ padding:'8px 12px', textAlign:'left', background:'transparent',
                              border:'1px dashed var(--rule)', borderRadius: 4, fontSize: 12.5,
                              color:'var(--muted)', cursor:'pointer' }}>
              + Pick a different activity manually…
            </button>
          </div>

          {/* How match is calculated */}
          <details style={{ marginTop: 10, fontSize: 12, color:'var(--muted)' }}>
            <summary style={{ cursor:'pointer', listStyle:'none', display:'flex', alignItems:'center', gap: 6 }}>
              <span className="wa-mono" style={{ fontSize: 10, color:'var(--muted-2)', letterSpacing:'0.06em' }}>↳ HOW MATCH % IS CALCULATED</span>
              <span style={{ fontSize: 10, color:'var(--muted-2)' }}>▾</span>
            </summary>
            <div style={{ marginTop: 8, padding:'10px 12px', background:'var(--paper)', border:'1px solid var(--border-soft)', borderRadius: 4, lineHeight: 1.6 }}>
              <div className="wa-mono" style={{ fontSize: 11, color:'var(--ink-2)' }}>
                similarity = <span style={{ color:'var(--rust)' }}>0.85</span> × semantic(title₁, title₂)
              </div>
              <div className="wa-mono" style={{ fontSize: 11, color:'var(--ink-2)' }}>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ <span style={{ color:'var(--amber)' }}>0.10</span> × (same cadence)
              </div>
              <div className="wa-mono" style={{ fontSize: 11, color:'var(--ink-2)', marginBottom: 8 }}>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ <span style={{ color:'var(--slate)' }}>0.05</span> × (same time bucket)
              </div>
              <div style={{ fontSize: 11.5, color:'var(--muted)' }}>
                <strong style={{ color:'var(--ink-2)' }}>Semantic</strong> = cosine similarity of sentence embeddings (titles embedded once on submit — instant lookup at merge time, no API hit).
                Candidates shown if ≥ 30%; auto-selected if ≥ 70%. Facilitator always picks finally.
              </div>
            </div>
          </details>

          {/* Preview */}
          <div className="wa-eyebrow" style={{ marginTop: 18, marginBottom: 8 }}>↓ After merge</div>
          <div style={{ background:'#fff', border:'2px solid var(--sage)', borderRadius: 6, padding:'14px 16px' }}>
            <div style={{ display:'flex', alignItems:'center', gap: 10, marginBottom: 8 }}>
              {/* Stacked avatars */}
              <div style={{ display:'inline-flex' }}>
                {mergedAuthors.map((a, i) => (
                  <div key={a.id} style={{ marginLeft: i ? -8 : 0, border:'2px solid #fff', borderRadius:'50%' }}>
                    <Avatar person={a} size="sm" />
                  </div>
                ))}
              </div>
              <span style={{ fontSize: 12, color:'var(--muted)' }}>
                Reported by <strong style={{ color:'var(--ink)' }}>{mergedAuthors[0].name.split(' ')[0]}</strong> + <strong style={{ color:'var(--ink)' }}>{mergedAuthors[1].name.split(' ')[0]}</strong>
              </span>
              <span className="wa-chip is-sage" style={{ marginLeft:'auto', fontWeight: 600 }}>⇄ merged · 2 reports</span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 10 }}>Drafting release notes</div>
            <div className="wa-mono" style={{ fontSize: 11, color:'var(--muted)', marginBottom: 10, fontStyle:'italic' }}>
              ↳ also reported as "Write release notes after every deploy"
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap: 6, alignItems:'center' }}>
              <span className="wa-chip is-rust" style={{ fontWeight: 600 }}>◷ {combinedDisplay}</span>
              <span style={{ width: 1, height: 16, background:'var(--rule)', margin:'0 4px' }} />
              <span className={`wa-chip ${TPO_TONE[source.tpo]}`}>{TPO_SHORT[source.tpo]} · per occurrence</span>
              <span className={`wa-chip ${FREQ_TONE[source.freq]}`}>{FREQ_SHORT[source.freq]}</span>
              <span className={`wa-chip ${ENERGY_TONE[source.energy]}`}>{ENERGY_SHORT[source.energy]}</span>
            </div>
            <div style={{ marginTop: 10, padding:'8px 10px', background:'var(--paper)', borderRadius: 3, fontSize: 11.5, color:'var(--ink-2)', lineHeight: 1.5 }}>
              <span className="wa-mono" style={{ fontSize: 10, color:'var(--muted)', marginRight: 6 }}>↳ EFFORT MATH</span>
              {TPO_LABEL[source.tpo].toLowerCase()} × {FREQ_LABEL[source.freq].toLowerCase()} ({sourceEffort.toFixed(1)}h) + {TPO_LABEL[chosen.tpo].toLowerCase()} × {FREQ_LABEL[chosen.freq].toLowerCase()} ({targetEffort.toFixed(1)}h) = {combinedHrs.toFixed(1)} h/wk team-wide
            </div>
          </div>

          {/* Settings */}
          <div style={{ marginTop: 14, display:'flex', gap: 18, flexWrap:'wrap' }}>
            <Toggle label="Preserve both authors as reporters" on />
            <Toggle label="Sum weekly effort" on />
            <Toggle label="Use source's energy + cadence" on />
          </div>
        </div>

        {/* Footer actions */}
        <div style={{ padding:'14px 22px', borderTop:'1px solid var(--border-soft)', display:'flex', gap: 10, alignItems:'center' }}>
          <button className="wa-btn is-ghost" style={{ padding:'8px 14px', fontSize: 13 }}>Treat as related, don't merge</button>
          <span style={{ flex: 1 }} />
          <button className="wa-btn is-ghost" style={{ padding:'8px 14px', fontSize: 13 }}>Cancel</button>
          <button className="wa-btn is-rust">⇄ Merge into "Drafting release notes"</button>
        </div>
      </div>

      <ArtboardFooter idx="10A" label="FACILITATOR · MERGE (ACTION)" />
    </div>
  );
}

function ActivitySummaryCard({ a }) {
  const p = WA_PERSON(a.who);
  return (
    <div style={{ background:'#fff', border:'1px solid var(--rule)', borderRadius: 6, padding:'12px 14px' }}>
      <div style={{ display:'flex', alignItems:'center', gap: 10, marginBottom: 8 }}>
        <Avatar person={p} size="sm" />
        <span style={{ fontSize: 12, color:'var(--muted)' }}>{p.name}</span>
        <EffortPill a={a} size="sm" />
      </div>
      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>{a.t}</div>
      <ActivityChipsShort a={a} />
    </div>
  );
}

function Toggle({ label, on }) {
  return (
    <label style={{ display:'inline-flex', alignItems:'center', gap: 8, fontSize: 12.5, color:'var(--ink-2)' }}>
      <span style={{ width: 30, height: 18, borderRadius: 9, background: on ? 'var(--ink)' : 'var(--rule)', position:'relative', flexShrink: 0 }}>
        <span style={{ position:'absolute', width: 12, height: 12, borderRadius:'50%', background:'#fff', top: 3, [on ? 'right' : 'left']: 3 }} />
      </span>
      {label}
    </label>
  );
}

window.FacilitatorMerge = FacilitatorMerge;
