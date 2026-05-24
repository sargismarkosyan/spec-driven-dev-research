'use client';

import { useState } from 'react';
import type { Activity } from '@/lib/domain/types';
import type { Energy, Freq, TeamAuto, Tpo } from '@/lib/domain/enums';
import { TEAM_AUTO_LABELS } from '@/lib/domain/enums';
import {
  emitActivityClassify,
  emitActivityDelete,
  emitActivityNote,
  emitActivityUpdate,
} from '@/lib/socket';
import { EffortPill } from '@/components/EffortPill';
import {
  EnergyQuestionBlock,
  FreqQuestionBlock,
  TpoQuestionBlock,
} from '@/components/QuestionBlock';
import { Avatar, Modal } from '@/components/ui';

export function EditModal({
  activity,
  sessionId,
  token,
  facilitatorName = 'Facilitator',
  onClose,
}: {
  activity: Activity;
  sessionId: string;
  token: string;
  facilitatorName?: string;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(activity.title);
  const [tpo, setTpo] = useState<Tpo>(activity.tpo);
  const [freq, setFreq] = useState<Freq>(activity.freq);
  const [energy, setEnergy] = useState<Energy>(activity.energy);
  const [note, setNote] = useState(activity.discussionNote);
  const [teamAuto, setTeamAuto] = useState<TeamAuto>(activity.teamAuto);

  const firstName = activity.participantName.split(/\s+/)[0] ?? activity.participantName;

  const save = () => {
    const fieldsChanged =
      title !== activity.title ||
      tpo !== activity.tpo ||
      freq !== activity.freq ||
      energy !== activity.energy;
    if (fieldsChanged) {
      emitActivityUpdate({
        sessionId,
        activityId: activity.id,
        token,
        title,
        tpo,
        freq,
        energy,
      });
    }
    if (teamAuto !== activity.teamAuto && teamAuto !== 'unclassified') {
      emitActivityClassify({
        sessionId,
        activityId: activity.id,
        token,
        verdict: teamAuto,
      });
    }
    if (note !== activity.discussionNote) {
      emitActivityNote({ sessionId, activityId: activity.id, token, note });
    }
    onClose();
  };

  const del = () => {
    emitActivityDelete({ sessionId, activityId: activity.id, token });
    onClose();
  };

  return (
    <Modal
      title={`Editing on behalf of ${firstName}`}
      width={760}
      maxHeight="92vh"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className="wa-btn is-ghost"
            onClick={del}
            style={{ marginRight: 'auto', color: 'var(--rust)', borderColor: 'var(--rust-bg)' }}
          >
            × Remove activity
          </button>
          <button type="button" className="wa-btn is-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="wa-btn is-rust" onClick={save}>
            Save changes
          </button>
        </>
      }
    >
      <p className="wa-eyebrow" style={{ color: 'var(--rust)' }}>
        ↳ Facilitator action · edit activity
      </p>
      <div className="wa-card" style={{ padding: 12, marginBottom: 16, background: 'var(--paper)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Avatar initials={activity.participantInitials} color={activity.participantColor} size="sm" />
              <span className="wa-mono" style={{ fontSize: 10, color: 'var(--muted-2)' }}>
                ↳ ORIGINAL · {activity.participantName}
              </span>
            </div>
            <p style={{ fontSize: 14, fontWeight: 600 }}>&ldquo;{activity.title}&rdquo;</p>
          </div>
          <EffortPill activity={activity} size="sm" />
        </div>
      </div>
      <label className="wa-label">Activity</label>
      <input
        className="wa-input"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{ marginBottom: 8 }}
      />
      <p className="wa-mono" style={{ fontSize: 10, color: 'var(--muted-2)', marginBottom: 16 }}>
        changes are visible to the original author with an &apos;edited by {facilitatorName || 'facilitator'}&apos; footnote
      </p>
      <TpoQuestionBlock value={tpo} onChange={setTpo} />
      <FreqQuestionBlock value={freq} onChange={setFreq} />
      <EnergyQuestionBlock value={energy} onChange={setEnergy} />
      <hr className="wa-rule" style={{ margin: '16px 0' }} />
      <label className="wa-label">
        Team verdict · automatability{' '}
        <span style={{ color: 'var(--muted-2)', fontWeight: 400 }}>set during discussion</span>
      </label>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {(['yes', 'maybe', 'no'] as const).map((v) => (
          <button
            key={v}
            type="button"
            className={`wa-btn ${teamAuto === v ? (v === 'yes' ? 'is-rust' : v === 'maybe' ? '' : '') : 'is-ghost'}`}
            style={
              teamAuto === v
                ? {
                    background: v === 'yes' ? 'var(--rust)' : v === 'maybe' ? 'var(--amber)' : 'var(--ink)',
                    color: 'var(--cream)',
                  }
                : undefined
            }
            onClick={() => setTeamAuto(v)}
          >
            {TEAM_AUTO_LABELS[v].long}
          </button>
        ))}
      </div>
      <label className="wa-label">Discussion note (optional)</label>
      <textarea
        className="wa-input"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add context for the team…"
        rows={3}
        style={{ marginBottom: 16, resize: 'vertical' }}
      />
      {activity.flagged && (
        <div
          style={{
            padding: 12,
            background: 'var(--rust-bg)',
            border: '1px solid var(--rust)',
            borderRadius: 4,
            marginBottom: 16,
          }}
        >
          <span style={{ color: 'var(--flag)', fontSize: 16 }}>★</span>
          <span style={{ fontWeight: 700, color: 'var(--rust)', marginLeft: 8 }}>
            Flagged for next quarter
          </span>
          <p style={{ fontSize: 12, color: 'var(--rust)', opacity: 0.8, marginTop: 4 }}>
            Will appear in the priority export
          </p>
        </div>
      )}
      {activity.editHistory.length > 0 && (
        <details>
          <summary className="wa-mono" style={{ fontSize: 11, cursor: 'pointer', marginBottom: 8 }}>
            ↳ EDIT HISTORY · {activity.editHistory.length} entries ▾
          </summary>
          <div style={{ background: 'var(--paper)', padding: 12, borderRadius: 4 }}>
            {activity.editHistory.map((e, i) => (
              <div key={i} className="wa-mono" style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
                {new Date(e.at).toLocaleTimeString()} — {e.who}: {e.what}
              </div>
            ))}
          </div>
        </details>
      )}
    </Modal>
  );
}
