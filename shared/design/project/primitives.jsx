// Shared primitives for Work Audit screens.
// v2 — question model revised: time(concrete) / frequency / energy + team-classified automate

// ----- Labels (long / short) -----
const TPO_LABEL   = { '<30m': 'Under 30 min', '30m-2h': '30 min – 2 hrs', 'half-day': 'Half day', 'day+': 'A full day or more' };
const TPO_SHORT   = { '<30m': '<30 min',      '30m-2h': '30m–2h',          'half-day': '½ day',     'day+': '1+ day' };
const TPO_SUB     = { '<30m': 'minutes',      '30m-2h': 'a couple hours',   'half-day': 'a chunk',   'day+': 'all in' };

const FREQ_LABEL  = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', adhoc: 'Ad hoc' };
const FREQ_SHORT  = { daily: 'Daily', weekly: 'Wkly',   monthly: 'Mthly',    quarterly: 'Qtrly',     adhoc: 'Ad hoc' };
const FREQ_SUB    = { daily: 'every day', weekly: 'each week', monthly: 'each month', quarterly: 'each quarter', adhoc: 'unpredictable' };

const ENERGY_LABEL = { energizing: 'Energizes me', neutral: 'Neutral',   draining: 'Drains me' };
const ENERGY_SHORT = { energizing: 'Energizes',    neutral: 'Neutral',   draining: 'Drains' };
const ENERGY_SUB   = { energizing: 'I like doing it', neutral: 'I just do it', draining: 'I dread it' };

const AUTO_LABEL  = { yes: 'Automatable', maybe: 'Maybe', no: 'Manual forever', unclassified: 'Needs review' };
const AUTO_SHORT  = { yes: 'Auto',         maybe: 'Maybe', no: 'Manual',        unclassified: 'Unclassified' };

// ----- Tones -----
const TPO_TONE   = { '<30m': 'is-sage', '30m-2h': '', 'half-day': 'is-amber', 'day+': 'is-rust' };
const FREQ_TONE  = { daily: 'is-rust',  weekly: 'is-amber', monthly: '', quarterly: '', adhoc: 'is-sage' };
const ENERGY_TONE = { energizing: 'is-sage', neutral: '', draining: 'is-rust' };
const AUTO_TONE  = { yes: 'is-rust', maybe: 'is-amber', no: '', unclassified: 'is-ghost' };

// Small chip
function Chip({ children, tone = '', icon }) {
  return (
    <span className={`wa-chip ${tone}`}>
      {icon ? <span>{icon}</span> : null}
      {children}
    </span>
  );
}

// Activity chip row — short labels, no automate (team-classified separately)
function ActivityChipsShort({ a, showAuto }) {
  return (
    <div className="wa-chiprow">
      <Chip tone={TPO_TONE[a.tpo]}>{TPO_SHORT[a.tpo]}</Chip>
      <Chip tone={FREQ_TONE[a.freq]}>{FREQ_SHORT[a.freq]}</Chip>
      <Chip tone={ENERGY_TONE[a.energy]}>{ENERGY_SHORT[a.energy]}</Chip>
      {showAuto && a.team_auto ? (
        <Chip tone={AUTO_TONE[a.team_auto]}>★ {AUTO_SHORT[a.team_auto]}</Chip>
      ) : null}
    </div>
  );
}

// Effort pill — the unified "h/wk" velocity number. Use as the headline metric on cards.
function EffortPill({ a, size }) {
  const { hrs, display } = WA_EFFORT(a);
  const tone = hrs < 1.5 ? 'is-sage'
             : hrs < 4   ? 'is-amber'
             : 'is-rust';
  const px = size === 'lg' ? { fontSize: 13, padding:'5px 10px', borderWidth: 1 }
           : size === 'sm' ? { fontSize: 10.5, padding:'2px 6px' }
           : { fontSize: 12, padding:'3px 8px' };
  return (
    <span className={`wa-chip ${tone}`} title={`${TPO_LABEL[a.tpo]} × ${FREQ_LABEL[a.freq]}`} style={{ ...px, fontWeight: 600, fontVariantNumeric:'tabular-nums' }}>
      ◷ {display}
    </span>
  );
}

function Avatar({ person, size = 'md' }) {
  const sz = size === 'sm' ? 'is-sm' : size === 'lg' ? 'is-lg' : '';
  return (
    <span className={`wa-avatar ${sz}`} style={{ background: person.color, color: '#fff' }}>
      {person.initials}
    </span>
  );
}

function Topbar({ title, sub, right }) {
  return (
    <div className="wa-topbar">
      <div className="wa-brand">
        <span className="wa-brandmark">W</span>
        <span>Work Audit</span>
      </div>
      <div style={{ height: 20, width: 1, background: 'var(--rule)' }} />
      <div style={{ display:'flex', flexDirection:'column', gap: 2 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{title}</div>
        {sub ? <div className="wa-eyebrow" style={{ fontSize: 10 }}>{sub}</div> : null}
      </div>
      <div style={{ marginLeft: 'auto', display:'flex', alignItems:'center', gap: 12 }}>
        {right}
      </div>
    </div>
  );
}

function Eyebrow({ children, color }) {
  return (
    <span className="wa-eyebrow" style={{ color: color || 'var(--muted)' }}>{children}</span>
  );
}

// Facilitator-only inline action chips — edit / merge / remove. Always visible in
// facilitator views (the facilitator can touch any card at any time).
function FacActions({ size }) {
  const px = size === 'sm' ? { fontSize: 10, padding:'2px 6px' } : { fontSize: 11, padding:'3px 7px' };
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap: 4 }}>
      <button title="Edit activity" style={{ ...px, background:'transparent', border:'1px solid var(--border-soft)', borderRadius: 3, cursor:'pointer', color:'var(--muted)', fontFamily:'var(--font-mono)', letterSpacing:'0.02em' }}>✎ edit</button>
      <button title="Merge into…"  style={{ ...px, background:'transparent', border:'1px solid var(--border-soft)', borderRadius: 3, cursor:'pointer', color:'var(--muted)', fontFamily:'var(--font-mono)', letterSpacing:'0.02em' }}>⇄ merge</button>
      <button title="Remove (with reason)" style={{ ...px, background:'transparent', border:'1px solid var(--border-soft)', borderRadius: 3, cursor:'pointer', color:'var(--muted)', fontFamily:'var(--font-mono)', letterSpacing:'0.02em' }}>×</button>
    </span>
  );
}

Object.assign(window, {
  Chip, ActivityChipsShort, EffortPill, Avatar, Topbar, Eyebrow, FacActions,
  TPO_LABEL, TPO_SHORT, TPO_SUB, TPO_TONE,
  FREQ_LABEL, FREQ_SHORT, FREQ_SUB, FREQ_TONE,
  ENERGY_LABEL, ENERGY_SHORT, ENERGY_SUB, ENERGY_TONE,
  AUTO_LABEL, AUTO_SHORT, AUTO_TONE,
});
