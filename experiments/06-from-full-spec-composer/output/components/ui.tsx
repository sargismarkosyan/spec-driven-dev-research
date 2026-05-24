'use client';

export function ClassifyBtn({
  label,
  sub,
  tone,
  active,
  onClick,
}: {
  label: string;
  sub: string;
  tone?: 'rust' | 'amber' | 'neutral';
  active?: boolean;
  onClick: () => void;
}) {
  const toneClass = tone ? `tone-${tone}` : 'tone-neutral';
  return (
    <button
      type="button"
      className={`wa-classify-btn ${toneClass} ${active ? 'is-active' : ''}`}
      onClick={onClick}
    >
      <span className="wa-classify-label">{label}</span>
      <span className="wa-classify-sub">{sub}</span>
    </button>
  );
}

export function FacActions({
  onEdit,
  onMerge,
  onRemove,
  size = 'md',
  visible,
}: {
  onEdit: () => void;
  onMerge: () => void;
  onRemove: () => void;
  size?: 'sm' | 'md';
  visible?: boolean;
}) {
  return (
    <div
      className={`wa-fac-actions ${size === 'sm' ? 'is-sm' : ''} ${visible ? 'wa-fac-actions-visible' : ''}`}
    >
      <button type="button" onClick={onEdit} title="Edit activity">
        ✎ edit
      </button>
      <button type="button" onClick={onMerge} title="Merge into…">
        ⇄ merge
      </button>
      <button type="button" onClick={onRemove} title="Remove">
        ×
      </button>
    </div>
  );
}

export function Avatar({
  initials,
  color,
  size,
}: {
  initials: string;
  color?: string;
  size?: 'sm' | 'lg';
}) {
  return (
    <span
      className={`wa-avatar ${size === 'sm' ? 'is-sm' : size === 'lg' ? 'is-lg' : ''}`}
      style={color ? { background: color, color: 'white' } : undefined}
    >
      {initials}
    </span>
  );
}

export function Topbar({
  left,
  center,
  right,
}: {
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <header className="wa-topbar">
      <div className="wa-topbar-left">{left}</div>
      {center ? <div className="wa-topbar-center">{center}</div> : null}
      <div className="wa-topbar-right">{right}</div>
    </header>
  );
}

export function Brand() {
  return (
    <a href="/" className="wa-brand" style={{ textDecoration: 'none', color: 'inherit' }}>
      <span className="wa-brandmark">W</span>
      Work Audit
    </a>
  );
}

export function Modal({
  title,
  width,
  maxHeight = '80vh',
  onClose,
  children,
  footer,
}: {
  title: string;
  width?: number;
  maxHeight?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="wa-modal-backdrop" onClick={onClose}>
      <div
        className="wa-modal"
        style={{ maxWidth: width ?? 600, maxHeight }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="wa-modal-body">
          <h2 className="wa-display" style={{ marginTop: 0, fontSize: 22 }}>
            {title}
          </h2>
          {children}
        </div>
        {footer && <div className="wa-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

export function TimerDisplay({
  display,
  urgent,
  show,
}: {
  display: string | null;
  urgent: boolean;
  show: boolean;
}) {
  if (!show || !display) return null;
  return (
    <span
      className={`wa-mono ${urgent ? 'wa-timer-urgent' : ''}`}
      style={{ fontVariantNumeric: 'tabular-nums', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 }}
    >
      <span
        className={`wa-dot ${urgent ? 'is-pulsing' : ''}`}
        style={{ background: urgent ? 'var(--rust)' : 'var(--sage)' }}
      />
      {display}
    </span>
  );
}

export function UndoToast({
  title,
  onUndo,
  progress,
}: {
  title?: string;
  onUndo: () => void;
  progress: number;
}) {
  return (
    <div className="wa-undo-toast">
      <span>{title ? `"${title}" removed` : 'Activity removed'}</span>
      <div className="wa-undo-drain">
        <div className="wa-undo-drain-fill" style={{ width: `${progress}%` }} />
      </div>
      <button type="button" className="wa-btn is-ghost" onClick={onUndo} style={{ padding: '6px 12px' }}>
        Undo
      </button>
    </div>
  );
}
