'use client';

import { useEffect, useState } from 'react';
import type { Energy, Freq, Tpo } from '@/lib/domain/enums';
import { emitActivityAdd } from '@/lib/socket';
import {
  EnergyQuestionBlock,
  FreqQuestionBlock,
  TpoQuestionBlock,
} from '@/components/QuestionBlock';

export type ActivityFormPrefill = {
  title: string;
  tpo: Tpo | null;
  freq: Freq | null;
  energy: Energy | null;
};

export function AddActivityForm({
  sessionId,
  name,
  count,
  prefill,
  onSaved,
  onCancel,
}: {
  sessionId: string;
  name: string;
  count: number;
  prefill: ActivityFormPrefill;
  onSaved: (andAnother: boolean) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(prefill.title);
  const [tpo, setTpo] = useState<Tpo | null>(prefill.tpo);
  const [freq, setFreq] = useState<Freq | null>(prefill.freq);
  const [energy, setEnergy] = useState<Energy | null>(prefill.energy);

  useEffect(() => {
    setTitle(prefill.title);
    setTpo(prefill.tpo);
    setFreq(prefill.freq);
    setEnergy(prefill.energy);
  }, [prefill]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  const canSave = !!title.trim() && tpo !== null && freq !== null && energy !== null;

  const resetToBlankDefaults = () => {
    setTitle('');
    setTpo(null);
    setFreq(null);
    setEnergy(null);
  };

  const save = (andAnother: boolean) => {
    if (!canSave || !tpo || !freq || !energy) return;
    emitActivityAdd({ sessionId, title: title.trim(), tpo, freq, energy });
    if (andAnother) {
      resetToBlankDefaults();
      onSaved(true);
    } else {
      onSaved(false);
    }
  };

  return (
    <div className="wa-card" style={{ padding: 20, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <p className="wa-mono" style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>
        Submitting as {name} · {count} activities
      </p>
      <label className="wa-label">What&apos;s the activity?</label>
      <input
        className="wa-input"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Triage Sentry alerts each morning"
        autoFocus
        style={{ marginBottom: 4, fontSize: 16 }}
      />
      <p className="wa-mono" style={{ fontSize: 11, color: 'var(--muted-2)', marginBottom: 16 }}>
        One activity per card. Be specific but quick.
      </p>
      <TpoQuestionBlock value={tpo} onChange={setTpo} />
      <FreqQuestionBlock value={freq} onChange={setFreq} />
      <EnergyQuestionBlock value={energy} onChange={setEnergy} />
      <hr className="wa-rule" style={{ marginBottom: 16 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          type="button"
          className="wa-btn is-rust"
          onClick={() => save(false)}
          disabled={!canSave}
        >
          Save activity
        </button>
        <button
          type="button"
          className="wa-btn is-ghost"
          onClick={() => save(true)}
          disabled={!canSave}
        >
          Save & add another
        </button>
        <button
          type="button"
          className="wa-btn is-ghost"
          onClick={onCancel}
          style={{ marginLeft: 'auto' }}
        >
          Esc · cancel
        </button>
      </div>
    </div>
  );
}
