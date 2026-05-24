import type { Activity, Session } from '../domain/types';
import {
  ENERGY_LABELS,
  TPO_LABELS,
} from '../domain/enums';
import { perceivedCostForActivity } from '../domain/calculations';

function formatDate(): string {
  return new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function sortActivities(activities: Activity[]): Activity[] {
  return [...activities].sort((a, b) => {
    if (a.flagged !== b.flagged) return a.flagged ? -1 : 1;
    return perceivedCostForActivity(b) - perceivedCostForActivity(a);
  });
}

function formatActivity(rank: number, activity: Activity): string {
  const pc = perceivedCostForActivity(activity).toFixed(1);
  const tpoLabel = TPO_LABELS[activity.tpo].long;
  let block = `### ${rank}. ${activity.title}\n`;
  block += `- **Who:** ${activity.participantName}\n`;
  block += `- **Effort:** ${tpoLabel} · ${activity.freq} · ~${pc} perceived h/wk\n`;
  block += `- **Energy:** ${ENERGY_LABELS[activity.energy].long}\n`;
  if (activity.discussionNote) {
    block += `- **Note:** ${activity.discussionNote}\n`;
  }
  if (activity.flagged) {
    block += `- ⭐ **Flagged priority**\n`;
  }
  return block;
}

function section(title: string, activities: Activity[]): string {
  let md = `## ${title}\n\n`;
  if (activities.length === 0) {
    md += '_None_\n\n';
    return md;
  }
  const sorted = sortActivities(activities);
  sorted.forEach((a, i) => {
    md += formatActivity(i + 1, a) + '\n';
  });
  return md;
}

export function generateRestExport(session: Session): { markdown: string; filename: string } {
  const visible = Array.from(session.activities.values());
  const automate = visible.filter((a) => a.teamAuto === 'yes');
  const investigate = visible.filter((a) => a.teamAuto === 'maybe');
  const manual = visible.filter((a) => a.teamAuto === 'no');

  const recoverable = automate.reduce((sum, a) => sum + perceivedCostForActivity(a), 0);

  let md = `# Work Audit — ${session.name}\n\n`;
  md += `${formatDate()}\n\n`;
  md += `**${automate.length} to automate · ${investigate.length} to investigate · ${manual.length} manual**\n\n`;
  md += `Estimated ~${recoverable.toFixed(1)} perceived h/wk recoverable.\n\n`;

  md += section('🔧 Automate — act now', automate);
  md += section('🔍 Investigate — research spike needed', investigate);
  md += section('✓ Manual — acknowledged, no action this quarter', manual);

  md += '_Automatability was tagged during the discussion phase — team consensus, not self-report._\n';

  return {
    markdown: md,
    filename: `${session.id}-audit.md`,
  };
}

export function generateMcpExport(session: Session): string {
  const allActivities = Array.from(session.activities.values());

  function formatBullet(activity: Activity): string {
    const star = activity.flagged ? ' ★' : '';
    let line = `- **${activity.title}** — ${activity.participantName} · ${activity.tpo} · ${activity.freq} · ${activity.energy}${star}\n`;
    if (activity.discussionNote) {
      line += `  _${activity.discussionNote}_\n`;
    }
    return line;
  }

  function formatSection(title: string, activities: Activity[]): string {
    let md = `## ${title} (${activities.length})\n`;
    for (const a of activities) {
      md += formatBullet(a);
    }
    md += '\n';
    return md;
  }

  const flagged = allActivities.filter((a) => a.flagged);
  const automatable = allActivities.filter((a) => a.teamAuto === 'yes');
  const maybe = allActivities.filter((a) => a.teamAuto === 'maybe');
  const manual = allActivities.filter((a) => a.teamAuto === 'no');
  const unclassified = allActivities.filter((a) => a.teamAuto === 'unclassified');

  let md = `# Work Audit · ${session.name}\n`;
  md += `Facilitator: ${session.facilitatorName} · ${allActivities.length} activities · ${session.participants.size} participants\n\n`;

  md += formatSection('★ Flagged priorities', flagged);
  md += formatSection('Automatable', automatable);
  md += formatSection('Maybe automatable', maybe);
  md += formatSection('Manual forever', manual);
  md += formatSection('Unclassified', unclassified);

  md += '---\n';
  md += '_Automatability classified by team during discussion — not self-report._\n';

  return md;
}
