'use client';

import { useState } from 'react';
import type { SerializedSession } from '@/lib/domain/types';
import type { Freq, Tpo } from '@/lib/domain/enums';
import {
  CATEGORY_DISPLAY_NAMES,
  CATEGORY_EXAMPLES,
  type CategoryId,
} from '@/lib/domain/constants';

export function PromptRail({
  session,
  onExample,
}: {
  session: SerializedSession;
  onExample: (title: string, tpo?: Tpo, freq?: Freq) => void;
}) {
  const categories = session.enabledCategories as CategoryId[];
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    categories.forEach((c, i) => {
      init[c] = i < 3;
    });
    return init;
  });

  return (
    <div className="wa-rail">
      <p className="wa-eyebrow">↳ Recall prompts</p>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
        Tap an example to pre-fill a card title. Don&apos;t filter — list everything.
      </p>
      {categories.map((catId) => (
        <div key={catId} className="wa-prompt-category">
          <div
            className="wa-prompt-header"
            onClick={() => setExpanded((e) => ({ ...e, [catId]: !e[catId] }))}
          >
            <span>{CATEGORY_DISPLAY_NAMES[catId]}</span>
            <span>{expanded[catId] ? '▲' : '▼'}</span>
          </div>
          {expanded[catId] &&
            CATEGORY_EXAMPLES[catId].map((ex) => (
              <div
                key={ex.title}
                className="wa-prompt-example"
                onClick={() => onExample(ex.title, ex.tpo, ex.freq)}
              >
                + {ex.title}
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}
