/**
 * Structured skills on student opening views (set by the placement cell).
 * Card: one compact line. Details modal: Required / Preferred chip groups.
 */

/** "React, TypeScript, CSS +2 more" — required skills first; preferred only when none are required. */
export function summarizeSkills(opening, max = 3) {
  const required = opening?.requiredSkills || [];
  const preferred = opening?.preferredSkills || [];
  const list = required.length ? required : preferred;
  if (!list.length) return null;
  const shown = list.slice(0, max).join(', ');
  const more = list.length > max ? ` +${list.length - max} more` : '';
  return { label: required.length ? 'Skills:' : 'Preferred:', text: `${shown}${more}`, all: list.join(', ') };
}

export function OpeningSkillsLine({ opening }) {
  const summary = summarizeSkills(opening);
  if (!summary) return null;
  return (
    <div className="eligibility-row">
      <span className="eligibility-key">{summary.label}</span>
      <span className="eligibility-val" title={summary.all}>{summary.text}</span>
    </div>
  );
}

function SkillGroup({ label, skills }) {
  if (!skills?.length) return null;
  return (
    <div className="opening-skill-group">
      <span className="opening-skill-group__label">{label}</span>
      <ul className="opening-skill-chips" aria-label={`${label} skills`}>
        {skills.map((s) => (
          <li key={s} className="opening-skill-chip">{s}</li>
        ))}
      </ul>
    </div>
  );
}

export default function OpeningSkillsSection({ opening }) {
  const required = opening?.requiredSkills || [];
  const preferred = opening?.preferredSkills || [];
  if (!required.length && !preferred.length) return null;
  return (
    <div className="opening-detail-section">
      <h4>Skills</h4>
      <SkillGroup label="Required" skills={required} />
      <SkillGroup label="Preferred" skills={preferred} />
      <p className="opening-skill-hint">Ask the AI Assistant whether your profile shows these skills.</p>
    </div>
  );
}
