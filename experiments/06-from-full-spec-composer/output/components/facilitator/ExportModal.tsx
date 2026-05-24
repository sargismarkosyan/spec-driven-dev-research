'use client';

import { useEffect, useState } from 'react';

const INCLUDES = [
  'Flagged priorities',
  'All activities',
  'Discussion notes',
  'Team verdict (auto)',
  'Effort per item (~h/wk)',
  'Author attribution',
];

export function ExportModal({
  sessionId,
  sessionName,
  onClose,
}: {
  sessionId: string;
  sessionName: string;
  onClose: () => void;
}) {
  const [markdown, setMarkdown] = useState('');
  const [copied, setCopied] = useState(false);
  const filename = `${sessionName.toLowerCase().replace(/[^\w]+/g, '-')}-audit.md`;

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}/export`)
      .then((r) => r.json())
      .then((d) => setMarkdown(d.markdown ?? ''));
  }, [sessionId]);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const download = () => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(28, 26, 22, 0.42)',
          backdropFilter: 'blur(2px)',
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 860,
          maxHeight: '88vh',
          background: 'var(--cream)',
          borderRadius: 8,
          boxShadow: '0 24px 80px rgba(0, 0, 0, 0.32)',
          border: '1px solid var(--rule)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-soft)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div style={{ flex: 1 }}>
            <p className="wa-eyebrow">Export · session output</p>
            <h2 className="wa-display" style={{ fontSize: 22, margin: '4px 0 0' }}>
              Take the priorities with you
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 0,
              fontSize: 20,
              color: 'var(--muted)',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 240px',
            flex: 1,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              overflowY: 'auto',
              padding: '20px 24px',
              background: '#fff',
              borderRight: '1px solid var(--border-soft)',
            }}
          >
            <pre
              className="wa-mono"
              style={{
                fontSize: 12,
                lineHeight: 1.65,
                color: 'var(--ink)',
                whiteSpace: 'pre-wrap',
                margin: 0,
              }}
            >
              {markdown}
            </pre>
          </div>

          <aside
            style={{
              padding: '20px 18px',
              background: 'var(--paper)',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div>
              <p className="wa-eyebrow">Includes</p>
              <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
                {INCLUDES.map((label) => (
                  <label
                    key={label}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}
                  >
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 3,
                        background: 'var(--ink)',
                        border: '1px solid var(--rule)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--cream)',
                        fontSize: 10,
                        flexShrink: 0,
                      }}
                    >
                      ✓
                    </span>
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div
              style={{
                background: '#fff',
                border: '1px dashed var(--rule)',
                borderRadius: 4,
                padding: '10px 12px',
                fontSize: 11,
                color: 'var(--ink-2)',
                lineHeight: 1.5,
              }}
            >
              <div className="wa-mono" style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>
                ↳ TEAM VERDICT
              </div>
              Automatability was tagged during the discussion phase — team consensus, not
              self-report.
            </div>

            <hr className="wa-rule" />

            <div>
              <p className="wa-eyebrow">Filename</p>
              <input
                className="wa-input"
                style={{ fontSize: 12, padding: '7px 9px', marginTop: 6 }}
                value={filename}
                readOnly
              />
            </div>

            <div style={{ marginTop: 'auto', display: 'grid', gap: 8 }}>
              <button type="button" className="wa-btn" style={{ justifyContent: 'center' }} onClick={copyToClipboard}>
                {copied ? '✓ Copied!' : 'Copy to clipboard'}
              </button>
              <button
                type="button"
                className="wa-btn is-ghost"
                style={{ justifyContent: 'center' }}
                onClick={download}
              >
                Download .md
              </button>
              <div
                className="wa-mono"
                style={{ fontSize: 10, color: 'var(--muted-2)', textAlign: 'center', marginTop: 4 }}
              >
                ↳ MCP connector available · use get_session or export_session_markdown
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
