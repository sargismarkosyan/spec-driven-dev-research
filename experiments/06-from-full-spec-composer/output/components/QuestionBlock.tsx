'use client';

import type { Energy, Freq, Tpo } from '@/lib/domain/enums';
import {
  ENERGY_LABELS,
  FREQ_LABELS,
  TPO_LABELS,
} from '@/lib/domain/enums';

type DimConfig<T extends string> = {
  num: string;
  question: string;
  hint: string;
  options: T[];
  labels: Record<T, { long: string; subtitle: string }>;
  value: T | null;
  onChange: (v: T) => void;
};

function QuestionBlockInner<T extends string>({
  num,
  question,
  hint,
  options,
  labels,
  value,
  onChange,
}: DimConfig<T>) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 8 }}>
        <span className="wa-num">{num}</span>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{question}</span>
        <span style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--muted)' }}>{hint}</span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            style={{
              flex: 1,
              padding: '10px 8px',
              border: `1px solid ${value === opt ? 'var(--ink)' : 'var(--rule)'}`,
              borderRadius: 4,
              background: value === opt ? 'var(--ink)' : 'white',
              color: value === opt ? 'var(--cream)' : 'var(--ink)',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ fontSize: '12.5px', fontWeight: 600 }}>{labels[opt].long}</div>
            <div
              className="wa-mono"
              style={{ fontSize: '10.5px', opacity: 0.7, marginTop: 2 }}
            >
              {labels[opt].subtitle}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function TpoQuestionBlock({
  value,
  onChange,
}: {
  value: Tpo | null;
  onChange: (v: Tpo) => void;
}) {
  const options: Tpo[] = ['<30m', '30m-2h', 'half-day', 'day+'];
  return (
    <QuestionBlockInner
      num="01"
      question="How long does it take each time?"
      hint="per occurrence, not total"
      options={options}
      labels={TPO_LABELS}
      value={value}
      onChange={onChange}
    />
  );
}

export function FreqQuestionBlock({
  value,
  onChange,
}: {
  value: Freq | null;
  onChange: (v: Freq) => void;
}) {
  const options: Freq[] = ['daily', 'weekly', 'monthly', 'quarterly', 'adhoc'];
  return (
    <QuestionBlockInner
      num="02"
      question="How often?"
      hint="roughly"
      options={options}
      labels={FREQ_LABELS}
      value={value}
      onChange={onChange}
    />
  );
}

export function EnergyQuestionBlock({
  value,
  onChange,
}: {
  value: Energy | null;
  onChange: (v: Energy) => void;
}) {
  const options: Energy[] = ['energizing', 'fine', 'tedious', 'draining'];
  return (
    <QuestionBlockInner
      num="03"
      question="How does it feel?"
      hint="your honest reaction"
      options={options}
      labels={ENERGY_LABELS}
      value={value}
      onChange={onChange}
    />
  );
}
