// Facilitator: Create session + Session lobby

function CreateSession() {
  return (
    <div className="wa-screen" style={{ background:'var(--paper)' }}>
      <Topbar
        title="New session"
        sub="FACILITATOR · STEP 1 / 2"
        right={<span className="wa-eyebrow">May 18 · 2026</span>}
      />

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', height:'calc(100% - 53px)' }}>
        {/* LEFT — editorial intro */}
        <div style={{ padding:'56px 64px 56px', background:'var(--paper)', display:'flex', flexDirection:'column', justifyContent:'center', borderRight:'1px solid var(--rule)' }}>
          <Eyebrow>The work audit · quarterly</Eyebrow>
          <h1 className="wa-display" style={{ fontSize: 48, lineHeight: 1.05, margin:'12px 0 18px', letterSpacing:'-0.02em' }}>
            What work are we doing,<br/>
            and should we still be<br/>
            doing it that way?
          </h1>
          <p style={{ color:'var(--muted)', maxWidth: 380, marginBottom: 32, fontSize: 15, lineHeight: 1.55 }}>
            Set up a session, share the link in your meeting,
            and spend ten minutes auditing the recurring work
            your team actually does.
          </p>
          <div className="wa-mono" style={{ fontSize: 11, color:'var(--muted-2)', letterSpacing:'0.06em', textTransform:'uppercase', display:'flex', gap: 16, flexWrap:'wrap' }}>
            <span>↳ No login for engineers</span>
            <span>↳ Sessions expire in 24h</span>
            <span>↳ Export to Markdown</span>
          </div>
        </div>

        {/* RIGHT — form */}
        <div style={{ padding:'40px 56px', background:'var(--cream)', overflowY:'auto' }}>
          <div style={{ maxWidth: 440 }}>
            <h2 className="wa-display" style={{ fontSize: 26, margin:'0 0 24px', fontWeight: 500 }}>Set up the session</h2>

            <div style={{ marginBottom: 22 }}>
              <label className="wa-label">Session name</label>
              <input className="wa-input" value="Platform team · Q2 audit" readOnly />
            </div>

            <div style={{ marginBottom: 22 }}>
              <label className="wa-label">Facilitator</label>
              <div style={{ display:'flex', alignItems:'center', gap: 10, padding:'8px 12px', border:'1px solid var(--border-soft)', borderRadius: 4, background:'#fff' }}>
                <Avatar person={WA_PERSON('de')} size="md" />
                <div style={{ display:'flex', flexDirection:'column' }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>Devon Okafor</span>
                  <span className="wa-mono" style={{ fontSize: 11, color:'var(--muted)' }}>devon@platform.eng</span>
                </div>
                <span className="wa-chip is-sage" style={{ marginLeft:'auto' }}>HOST</span>
              </div>
            </div>

            <div style={{ marginBottom: 22 }}>
              <label className="wa-label">Submission window <span style={{ textTransform:'none', letterSpacing: 0, color:'var(--muted-2)', fontFamily:'var(--font-body)', fontWeight: 400 }}>· soft, extendable</span></label>
              <div className="wa-seg">
                <button>5 min</button>
                <button className="is-on">10 min</button>
                <button>15 min</button>
                <button>20 min</button>
                <button>Untimed</button>
              </div>
              <p style={{ fontSize: 12, color:'var(--muted)', marginTop: 8, lineHeight: 1.55 }}>
                A hint, not a lock. Engineers see a countdown but submissions don't close — you can <span style={{ color:'var(--ink-2)', fontFamily:'var(--font-mono)', fontSize: 11 }}>+2 / +5 / extend</span> mid-session, or end early.
                Late joiners can still drop in after the round starts.
              </p>
            </div>

            <div style={{ marginBottom: 22 }}>
              <label className="wa-label">Recall prompts in submission rail</label>
              <div style={{ display:'flex', flexWrap:'wrap', gap: 6 }}>
                {[
                  ['Yesterday & this week', true],
                  ['Weekly meetings',       true],
                  ['Monthly rituals',       true],
                  ['Quarterly cycles',      true],
                  ['Annual / one-offs',     true],
                  ['Things you procrastinate', true],
                  ['"Manual but should be automatic"', true],
                  ['Custom prompt…',        false],
                ].map(([txt, on], i) => (
                  <span key={i} className={`wa-chip ${on ? 'is-sage' : 'is-ghost'}`} style={{ borderStyle: on ? 'solid' : 'dashed' }}>
                    {on ? '✓ ' : '+ '}{txt}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 28 }}>
              <label className="wa-label">Live colleague feed</label>
              <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
                <div style={{ width: 34, height: 20, borderRadius: 10, background:'var(--ink)', position:'relative', flexShrink: 0 }}>
                  <div style={{ width: 14, height: 14, borderRadius:'50%', background:'#fff', position:'absolute', top: 3, right: 3 }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>Engineers see each other's activities live</div>
                  <div style={{ fontSize: 12, color:'var(--muted)' }}>Transparency, not surveillance. Helps recall.</div>
                </div>
              </div>
            </div>

            <div style={{ display:'flex', alignItems:'center', gap: 12 }}>
              <button className="wa-btn">Create session →</button>
              <button className="wa-btn is-ghost">Save as template</button>
            </div>

            <hr className="wa-rule" style={{ margin:'28px 0 16px' }} />
            <div className="wa-mono" style={{ fontSize: 11, color:'var(--muted-2)', letterSpacing:'0.04em' }}>
              ↳ EXISTING SESSIONS &nbsp;&nbsp; <span style={{ color:'var(--ink-2)' }}>3 archived this quarter</span>
            </div>
          </div>
        </div>
      </div>

      <ArtboardFooter idx="01" label="FACILITATOR · CREATE" />
    </div>
  );
}

function SessionLobby() {
  const joined = ['sa', 'ma', 'je', 'pr'].map(WA_PERSON);
  const pending = ['na'].map(WA_PERSON);
  return (
    <div className="wa-screen" style={{ background:'var(--paper)' }}>
      <Topbar
        title="Platform team · Q2 audit"
        sub="FACILITATOR · LOBBY · WAITING"
        right={
          <span style={{ display:'inline-flex', alignItems:'center', gap: 6 }}>
            <span className="wa-dot is-pulsing" style={{ background:'var(--rust)' }} />
            <span className="wa-mono" style={{ fontSize: 11, color:'var(--muted)' }}>4 / 6 JOINED</span>
          </span>
        }
      />

      <div style={{ display:'grid', gridTemplateColumns:'1.1fr 1fr', height:'calc(100% - 53px)' }}>
        <div style={{ padding:'48px 56px', borderRight:'1px solid var(--rule)' }}>
          <Eyebrow>Share with your team</Eyebrow>
          <h2 className="wa-display" style={{ fontSize: 32, margin:'10px 0 24px', fontWeight: 500 }}>
            Send everyone this link.
          </h2>

          <div style={{ background:'#fff', border:'1px solid var(--rule)', borderRadius: 6, padding: 18, marginBottom: 20 }}>
            <div className="wa-eyebrow" style={{ marginBottom: 10 }}>Join URL</div>
            <div style={{ display:'flex', alignItems:'center', gap: 12 }}>
              <code className="wa-mono" style={{ fontSize: 16, color:'var(--ink)', flex: 1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                workaudit.app/<span style={{ color:'var(--rust)' }}>platform-q2-7f3k</span>
              </code>
              <button className="wa-btn is-ghost" style={{ padding:'7px 12px', fontSize: 12 }}>Copy</button>
            </div>
          </div>

          <div style={{ display:'flex', gap: 18, marginBottom: 28 }}>
            {/* QR placeholder */}
            <div style={{ width: 120, height: 120, background:'#fff', border:'1px solid var(--rule)', borderRadius: 6, padding: 8 }}>
              <div style={{ width:'100%', height:'100%', background: `
                repeating-linear-gradient(0deg, var(--ink) 0 4px, transparent 4px 8px),
                repeating-linear-gradient(90deg, var(--ink) 0 4px, transparent 4px 8px)
              `, opacity: 0.85, borderRadius: 2, maskImage:'radial-gradient(circle at 50% 50%, #000 60%, transparent 100%)' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="wa-eyebrow" style={{ marginBottom: 8 }}>Or post in Slack</div>
              <div style={{ background:'var(--paper)', border:'1px solid var(--border-soft)', borderRadius: 4, padding:'10px 12px', fontSize: 13, color:'var(--ink-2)', marginBottom: 8 }}>
                #platform-team · @devon · <span style={{ color:'var(--muted)' }}>just now</span>
                <div style={{ marginTop: 6 }}>
                  Starting our quarterly work audit in 2 min — join here: <span className="wa-mono" style={{ color:'var(--rust)' }}>workaudit.app/platform-q2-7f3k</span>
                </div>
              </div>
              <button className="wa-btn is-ghost" style={{ padding:'6px 10px', fontSize: 12 }}>Send to Slack</button>
            </div>
          </div>

          <hr className="wa-rule" style={{ margin:'0 0 20px' }} />

          <div style={{ display:'flex', alignItems:'center', gap: 12 }}>
            <button className="wa-btn is-rust">Start submissions →</button>
            <span style={{ fontSize: 12, color:'var(--muted)' }}>You can also wait — engineers can join any time before you start.</span>
          </div>
        </div>

        {/* RIGHT — joined list */}
        <div style={{ padding:'32px 40px', background:'var(--cream)', overflowY:'auto' }}>
          <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom: 18 }}>
            <h3 className="wa-display" style={{ fontSize: 22, margin: 0, fontWeight: 500 }}>Joined</h3>
            <span className="wa-mono" style={{ fontSize: 11, color:'var(--muted)' }}>{joined.length} / 6</span>
          </div>

          <div style={{ display:'grid', gap: 8 }}>
            {joined.map((p, i) => (
              <div key={p.id} style={{ display:'flex', alignItems:'center', gap: 12, padding:'10px 12px', background:'#fff', border:'1px solid var(--border-soft)', borderRadius: 4 }}>
                <Avatar person={p} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                  <div className="wa-mono" style={{ fontSize: 11, color:'var(--muted)' }}>{p.role}</div>
                </div>
                <span className="wa-mono" style={{ fontSize: 11, color:'var(--muted-2)' }}>+ {i*23 + 14}s</span>
                <span className="wa-dot" style={{ background:'var(--sage)' }} />
              </div>
            ))}
          </div>

          <div className="wa-eyebrow" style={{ marginTop: 22, marginBottom: 10 }}>Invited · not yet joined</div>
          <div style={{ display:'grid', gap: 8 }}>
            {pending.map(p => (
              <div key={p.id} style={{ display:'flex', alignItems:'center', gap: 12, padding:'10px 12px', background:'transparent', border:'1px dashed var(--rule)', borderRadius: 4, opacity: 0.7 }}>
                <div className="wa-avatar" style={{ background:'var(--border)', color:'var(--muted)' }}>{p.initials}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color:'var(--muted)' }}>{p.name}</div>
                  <div className="wa-mono" style={{ fontSize: 11, color:'var(--muted-2)' }}>Reminder sent · 2m ago</div>
                </div>
                <button className="wa-btn is-ghost" style={{ padding:'4px 8px', fontSize: 11 }}>Nudge</button>
              </div>
            ))}
            <div style={{ display:'flex', alignItems:'center', gap: 12, padding:'10px 12px', border:'1px dashed var(--rule)', borderRadius: 4, color:'var(--muted)' }}>
              <span style={{ fontSize: 14 }}>+</span>
              <span style={{ fontSize: 13 }}>Add a teammate by email</span>
            </div>
          </div>
        </div>
      </div>

      <ArtboardFooter idx="02" label="FACILITATOR · LOBBY" />
    </div>
  );
}

function ArtboardFooter({ idx, label }) {
  return (
    <div style={{ position:'absolute', bottom: 10, left: 24, right: 24, display:'flex', alignItems:'center', gap: 8, pointerEvents:'none' }}>
      <span className="wa-mono" style={{ fontSize: 9, color:'var(--muted-2)', letterSpacing:'0.1em' }}>{idx}</span>
      <span className="wa-mono" style={{ fontSize: 9, color:'var(--muted-2)', letterSpacing:'0.1em' }}>·</span>
      <span className="wa-mono" style={{ fontSize: 9, color:'var(--muted-2)', letterSpacing:'0.1em' }}>{label}</span>
    </div>
  );
}

window.CreateSession = CreateSession;
window.SessionLobby = SessionLobby;
window.ArtboardFooter = ArtboardFooter;
