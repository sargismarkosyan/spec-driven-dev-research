'use client';

export function QStrip<T extends string>({
  options,
  value,
  onChange,
  labels,
}: {
  options: T[];
  value: T;
  onChange?: (v: T) => void;
  labels: Record<T, string>;
}) {
  const interactive = !!onChange;
  return (
    <div className="wa-qseg-row">
      {options.map((opt) => (
        interactive ? (
          <button
            key={opt}
            type="button"
            className={`wa-qseg is-tappable ${value === opt ? 'is-on' : ''}`}
            onClick={() => onChange!(opt)}
          >
            {labels[opt]}
          </button>
        ) : (
          <div key={opt} className={`wa-qseg ${value === opt ? 'is-on' : ''}`}>
            {labels[opt]}
          </div>
        )
      ))}
    </div>
  );
}
