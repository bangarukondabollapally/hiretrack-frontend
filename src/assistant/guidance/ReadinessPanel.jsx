import { Link } from 'react-router-dom';
import {
  CRITERION_LABELS,
  ELIGIBILITY_LABELS,
  READINESS_LABELS,
  SKILL_STATUS_LABELS,
  groupSkills,
  labelFor,
} from './guidanceLabels';

/**
 * Verified readiness for one opening: eligibility checklist and skill comparison.
 * Unknown items are shown as "Unknown" (add to profile), never as failures.
 */
export default function ReadinessPanel({ assessment, compact = false }) {
  const { opening, eligibility, skills, readiness, skillSource } = assessment;
  const level = labelFor(READINESS_LABELS, readiness.level);
  const elig = labelFor(ELIGIBILITY_LABELS, eligibility.verdict);
  const groups = groupSkills(skills);
  // When nothing about the student's skills is known, one row per skill just repeats "Unknown":
  // list the requirements compactly instead.
  const allSkillsUnknown = skills.length > 0 && skills.every((s) => s.status === 'UNKNOWN');
  const hasUnknown =
    eligibility.criteria.some((c) => c.status === 'UNKNOWN') || skills.some((s) => s.status === 'UNKNOWN');

  return (
    <section className={`gd-readiness ${compact ? 'gd-readiness--compact' : ''}`} aria-label={`Readiness for ${opening.companyName}`}>
      {!compact && (
        <header className="gd-readiness__head">
          <div>
            <span className="gd-readiness__title">
              {opening.companyName} — {opening.jobRole}
            </span>
            {readiness.reasons.map((r) => (
              <p key={r} className="gd-readiness__reason">{r}</p>
            ))}
          </div>
          <span className={`gd-pill gd-pill--${level.tone}`}>{level.label}</span>
        </header>
      )}

      <div className="gd-block">
        <div className="gd-block__title">
          Eligibility <span className={`gd-dot gd-dot--${elig.tone}`}>{elig.label}</span>
        </div>
        {eligibility.criteria.length === 0 ? (
          <p className="gd-muted">No degree, branch, year or CGPA restrictions listed.</p>
        ) : (
          <ul className="gd-rows">
            {eligibility.criteria.map((c) => {
              const s = labelFor(CRITERION_LABELS, c.status);
              return (
                <li key={c.key} className="gd-row">
                  <span className="gd-row__label">{c.label}</span>
                  <span className="gd-row__detail">
                    Requires {c.requirement} · You: {c.studentValue ?? 'not in profile'}
                  </span>
                  <span className={`gd-status gd-status--${s.tone}`}>{s.label}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="gd-block">
        <div className="gd-block__title">
          Skills
          {skillSource === 'DESCRIPTION' && <span className="gd-muted"> · detected in the job description</span>}
        </div>
        {groups.length === 0 ? (
          <p className="gd-muted">The placement cell has not listed specific skills for this opening.</p>
        ) : allSkillsUnknown ? (
          <>
            <ul className="gd-rows">
              {groups.map((g) => (
                <li key={g.key} className="gd-row gd-row--summary">
                  <span className="gd-row__label">{g.label}</span>
                  <span className="gd-row__detail">{g.items.map((s) => s.skill).join(', ')}</span>
                  <span className="gd-status gd-status--neutral">Unknown</span>
                </li>
              ))}
            </ul>
            <p className="gd-muted">Your profile has no skills, projects or resume yet, so these can’t be compared.</p>
          </>
        ) : (
          groups.map((g) => (
            <div key={g.key} className="gd-skill-group">
              <span className="gd-skill-group__label">{g.label}</span>
              <ul className="gd-rows">
                {g.items.map((s) => {
                  const st = labelFor(SKILL_STATUS_LABELS, s.status);
                  return (
                    <li key={`${g.key}-${s.skill}`} className="gd-row">
                      <span className="gd-row__label">{s.skill}</span>
                      <span className="gd-row__detail">{s.evidence}</span>
                      <span className={`gd-status gd-status--${st.tone}`} title={st.hint}>
                        {st.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </div>

      {hasUnknown && (
        <p className="gd-note">
          “Unknown” means your profile doesn’t say yet — it is not counted against you. Add the details in{' '}
          <Link to="/settings?tab=job-search">Settings → Job search</Link>.
        </p>
      )}
    </section>
  );
}
