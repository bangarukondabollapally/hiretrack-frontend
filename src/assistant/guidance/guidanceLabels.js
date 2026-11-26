/**
 * Display helpers for the career-guidance payload sent by the backend
 * (see backend/src/modules/assistant/matching/types.ts). Pure functions only.
 */

export const READINESS_LABELS = {
  READY: { label: 'Ready to apply', tone: 'success' },
  NEARLY_READY: { label: 'Nearly ready', tone: 'info' },
  NOT_YET: { label: 'Not yet ready', tone: 'warning' },
  NOT_ELIGIBLE: { label: 'Not eligible', tone: 'danger' },
  NEEDS_INFO: { label: 'Needs profile details', tone: 'neutral' },
};

export const ELIGIBILITY_LABELS = {
  ELIGIBLE: { label: 'Eligible', tone: 'success' },
  NOT_ELIGIBLE: { label: 'Not eligible', tone: 'danger' },
  UNCONFIRMED: { label: 'Eligibility unconfirmed', tone: 'neutral' },
};

export const CRITERION_LABELS = {
  MET: { label: 'Meets', tone: 'success' },
  NOT_MET: { label: 'Does not meet', tone: 'danger' },
  UNKNOWN: { label: 'Unknown', tone: 'neutral' },
};

export const SKILL_STATUS_LABELS = {
  MET: { label: 'Shown', tone: 'success', hint: 'Listed in your skills or used in a project' },
  PARTIAL: { label: 'Mentioned', tone: 'info', hint: 'Mentioned in your resume or summary, but not demonstrated' },
  GAP: { label: 'Not shown', tone: 'warning', hint: 'Not shown anywhere in your profile' },
  UNKNOWN: { label: 'Unknown', tone: 'neutral', hint: 'Your profile does not have enough information yet' },
};

export const IMPORTANCE_LABELS = {
  REQUIRED: 'Required',
  PREFERRED: 'Preferred',
  DESCRIBED: 'From description',
};

export const AVAILABILITY_LABELS = {
  OPEN: null,
  CLOSED: 'Closed',
  EXPIRED: 'Deadline passed',
};

const FALLBACK = { label: 'Unknown', tone: 'neutral' };
export const labelFor = (map, key) => map[key] || FALLBACK;

/** "Deadline in 3 days" / "Deadline today" / "Deadline 12 Jan" (date-only, no timezone shifts). */
export function formatDeadline(deadline, today = new Date()) {
  if (!deadline) return null;
  const [y, m, d] = deadline.split('-').map(Number);
  if (!y || !m || !d) return null;
  const due = Date.UTC(y, m - 1, d);
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.round((due - now) / 86_400_000);
  if (days < 0) return 'Deadline passed';
  if (days === 0) return 'Deadline today';
  if (days === 1) return 'Deadline tomorrow';
  if (days <= 14) return `Deadline in ${days} days`;
  return `Deadline ${new Date(due).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })}`;
}

/** Groups skill assessments by importance, preserving order. */
export function groupSkills(skills = []) {
  const groups = [];
  for (const key of ['REQUIRED', 'PREFERRED', 'DESCRIBED']) {
    const items = skills.filter((s) => s.importance === key);
    if (items.length) groups.push({ key, label: IMPORTANCE_LABELS[key], items });
  }
  return groups;
}

/** One-line summary of key skills, e.g. "3 of 4 key skills shown · 1 not shown". */
export function skillSummary(counts) {
  if (!counts || !counts.required) return 'No required skills listed';
  const parts = [`${counts.met} of ${counts.required} key skills shown`];
  if (counts.partial) parts.push(`${counts.partial} mentioned`);
  if (counts.gaps) parts.push(`${counts.gaps} not shown`);
  if (counts.unknown) parts.push(`${counts.unknown} unknown`);
  return parts.join(' · ');
}

/** Builds the chat request for a contextual action on opening cards. */
export function buildActionRequest(action, openings) {
  const list = Array.isArray(openings) ? openings : [openings];
  const ids = list.map((o) => o.id);
  const names = list.map((o) => `${o.companyName} — ${o.jobRole}`);
  switch (action) {
    case 'readiness':
      return { text: `Am I ready to apply for ${names[0]}?`, intent: 'READINESS', openingIds: ids.slice(0, 1) };
    case 'upskill':
      return { text: `What should I learn to be ready for ${names[0]}?`, intent: 'UPSKILL', openingIds: ids.slice(0, 1) };
    case 'compare':
      return { text: `Compare ${names.join(' and ')}.`, intent: 'COMPARE', openingIds: ids.slice(0, 3) };
    default:
      return null;
  }
}

/** Assessments for the given ids, in that order (unknown ids skipped). */
export function pickAssessments(guidance, ids) {
  const byId = new Map((guidance?.openings || []).map((a) => [a.opening.id, a]));
  return (ids || []).map((id) => byId.get(id)).filter(Boolean);
}

/** Readable list of missing profile fields: "skills, CGPA and projects". */
export function formatMissing(missing = []) {
  if (missing.length <= 1) return missing.join('');
  return `${missing.slice(0, -1).join(', ')} and ${missing[missing.length - 1]}`;
}
