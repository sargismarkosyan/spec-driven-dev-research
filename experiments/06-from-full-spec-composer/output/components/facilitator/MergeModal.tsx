'use client';

import { useMemo, useState } from 'react';
import type { Activity, SerializedSession } from '@/lib/domain/types';
import type { Energy, Freq, Tpo } from '@/lib/domain/enums';
import { FREQ_LABELS, TPO_LABELS } from '@/lib/domain/enums';
import { effortHoursForActivity } from '@/lib/domain/calculations';
import { findMergeCandidates, similarityBadgeClass } from '@/lib/domain/merge';
import { emitActivityMerge } from '@/lib/socket';
import {
  EnergyQuestionBlock,
  FreqQuestionBlock,
  TpoQuestionBlock,
} from '@/components/QuestionBlock';
import { Avatar, Modal } from '@/components/ui';

export function MergeModal({
  source,
  session,
  token,
  onClose,
}: {
  source: Activity;
  session: SerializedSession;
  token: string;
  onClose: () => void;
}) {
  const candidates = findMergeCandidates(
    source,
    session.activities.filter((a) => !a.isMergedSource),
  );
  const [selected, setSelected] = useState<string[]>([source.id]);
  const [search, setSearch] = useState('');
  const [title, setTitle] = useState(source.title);
  const [tpo, setTpo] = useState<Tpo>(source.tpo);
  const [freq, setFreq] = useState<Freq>(source.freq);
  const [energy, setEnergy] = useState<Energy>(source.energy);

  const selectedActivities = session.activities.filter((a) => selected.includes(a.id));
  const totalHrs = selectedActivities.reduce((sum, a) => sum + effortHoursForActivity(a), 0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter(
      ({ activity }) =>
        activity.title.toLowerCase().includes(q) ||
        activity.participantName.toLowerCase().includes(q),
    );
  }, [candidates, search]);

  const toggle = (id: string) => {
    if (id === source.id) return;
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const merge = () => {
    if (selected.length < 2) return;
    emitActivityMerge({
      sessionId: session.id,
      token,
      sourceIds: selected,
      title,
      tpo,
      freq,
      energy,
    });
    onClose();
  };

  const sourceFirst = source.participantName.split(/\s+/)[0];

  return (
    <Modal
      title="Select cards to merge — a new card is created, originals are kept."
      width={900}
      maxHeight="90vh"
      onClose={onClose}
      footer={
        <>
          <span style={{ marginRight: 'auto', fontSize: 12, color: 'var(--muted-2)' }}>
            {selected.length >= 2
              ? `Creating 1 merged card from ${selected.length} originals.`
              : 'Select at least one more card to merge.'}
          </span>
          <button type="button" className="wa-btn is-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="wa-btn is-rust" onClick={merge} disabled={selected.length < 2}>
            ⇄ Create merged card →
          </button>
        </>
      }
    >
      <p className="wa-eyebrow" style={{ color: 'var(--rust)' }}>
        ↳ Facilitator action · merge activities
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div>
          <p className="wa-eyebrow">Select cards to merge · {selected.length} selected</p>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: 10,
              marginBottom: 8,
              border: '1px solid var(--border-soft)',
              borderRadius: 4,
              background: 'var(--paper-deep)',
            }}
          >
            <input type="checkbox" checked readOnly />
            <Avatar initials={source.participantInitials} color={source.participantColor} size="sm" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {source.title}
              </div>
              <div className="wa-mono" style={{ fontSize: 10, color: 'var(--muted-2)' }}>
                {sourceFirst} · {TPO_LABELS[source.tpo].short} · {FREQ_LABELS[source.freq].short}
              </div>
            </div>
            <span className="wa-chip is-ghost">starting card</span>
          </label>
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <span style={{ position: 'absolute', left: 10, top: 10, color: 'var(--muted-2)' }}>⌕</span>
            <input
              className="wa-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search other activities…"
              autoFocus
              style={{ paddingLeft: 28, width: '100%' }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: 8,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--muted-2)',
                }}
              >
                ×
              </button>
            )}
          </div>
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <p style={{ fontStyle: 'italic', color: 'var(--muted-2)', fontSize: 13 }}>
                No activities match &apos;{search}&apos;.
              </p>
            ) : (
              filtered.map(({ activity, score }) => (
                <label
                  key={activity.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: 8,
                    marginBottom: 4,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(activity.id)}
                    onChange={() => toggle(activity.id)}
                  />
                  <Avatar initials={activity.participantInitials} color={activity.participantColor} size="sm" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {activity.title}
                    </div>
                    <div className="wa-mono" style={{ fontSize: 10, color: 'var(--muted-2)' }}>
                      {activity.participantName.split(/\s+/)[0]} · {TPO_LABELS[activity.tpo].short} ·{' '}
                      {FREQ_LABELS[activity.freq].short}
                    </div>
                  </div>
                  {score > 0.15 && (
                    <span className={`wa-chip ${similarityBadgeClass(score) ?? ''}`}>
                      {Math.round(score * 100)}%
                    </span>
                  )}
                </label>
              ))
            )}
          </div>
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ display: 'flex' }}>
              {selectedActivities.map((a) => (
                <Avatar
                  key={a.id}
                  initials={a.participantInitials}
                  color={a.participantColor}
                  size="sm"
                />
              ))}
            </div>
            <span className="wa-chip is-sage" style={{ marginLeft: 'auto' }}>
              ⇄ {selected.length} cards · ~{totalHrs.toFixed(1)} h/wk
            </span>
          </div>
          <p style={{ fontSize: 12, marginBottom: 16 }}>
            {selectedActivities.map((a) => a.participantName.split(/\s+/)[0]).join(' + ')}
          </p>
          <label className="wa-label">Title</label>
          <input
            className="wa-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Describe the merged activity…"
            style={{ marginBottom: 12, fontWeight: 700, fontSize: 14 }}
          />
          <TpoQuestionBlock value={tpo} onChange={setTpo} />
          <FreqQuestionBlock value={freq} onChange={setFreq} />
          <EnergyQuestionBlock value={energy} onChange={setEnergy} />
          <p style={{ fontSize: 11, color: 'var(--muted-2)', marginTop: 16 }}>
            ↳ Original cards are kept and linked to this merged card so you can trace back to what was
            submitted.
          </p>
        </div>
      </div>
    </Modal>
  );
}
