import {
  ELIGIBILITY_LABELS,
  READINESS_LABELS,
  formatDeadline,
  labelFor,
  skillSummary,
} from './guidanceLabels';

const skillsWith = (a, statuses) => a.skills.filter((s) => statuses.includes(s.status)).map((s) => s.skill);
const listOrDash = (items) => (items.length ? items.join(', ') : '—');

/** Rows of the comparison. `optional` rows are hidden when empty for every opening. */
export function comparisonRows(assessments) {
  const rows = [
    {
      label: 'Readiness',
      render: (a) => {
        const l = labelFor(READINESS_LABELS, a.readiness.level);
        return <span className={`gd-pill gd-pill--${l.tone}`}>{l.label}</span>;
      },
    },
    {
      label: 'Eligibility',
      render: (a) => {
        const l = labelFor(ELIGIBILITY_LABELS, a.eligibility.verdict);
        const open = a.eligibility.criteria
          .filter((c) => c.status !== 'MET')
          .map((c) => `${c.label} ${c.status === 'UNKNOWN' ? '(unknown)' : '(not met)'}`);
        return (
          <>
            <span className={`gd-dot gd-dot--${l.tone}`}>{l.label}</span>
            {open.length > 0 && <div className="gd-muted">{open.join(', ')}</div>}
          </>
        );
      },
    },
    { label: 'Key skills', render: (a) => skillSummary(a.counts) },
    { label: 'You show', values: (a) => skillsWith(a, ['MET']) },
    { label: 'To develop', values: (a) => skillsWith(a, ['GAP', 'PARTIAL']) },
    { label: 'Unknown', values: (a) => skillsWith(a, ['UNKNOWN']), optional: true },
    {
      label: 'Details',
      values: (a) => [a.opening.jobType, a.opening.workMode, a.opening.packageDetails, formatDeadline(a.opening.deadline)].filter(Boolean),
    },
  ];
  return rows
    .filter((r) => !r.optional || assessments.some((a) => r.values(a).length > 0))
    .map((r) => ({ label: r.label, render: r.render ?? ((a) => listOrDash(r.values(a))) }));
}

/**
 * Side-by-side comparison of 2–3 verified opening assessments. On narrow screens
 * the same rows are shown stacked per opening (CSS switches the two layouts).
 */
export default function ComparisonView({ assessments }) {
  if (!assessments || assessments.length < 2) return null;
  const rows = comparisonRows(assessments);

  return (
    <div className="gd-compare" role="region" aria-label="Opening comparison">
      <table className="gd-compare__table">
        <thead>
          <tr>
            <th scope="col">
              <span className="visually-hidden">Criterion</span>
            </th>
            {assessments.map((a) => (
              <th key={a.opening.id} scope="col">
                <span className="gd-card__company">{a.opening.companyName}</span>
                <span className="gd-card__role">{a.opening.jobRole}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th scope="row">{row.label}</th>
              {assessments.map((a) => (
                <td key={a.opening.id}>{row.render(a)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Only one layout is displayed at a time (media query), so only one is in the accessibility tree. */}
      <div className="gd-compare__stack">
        {assessments.map((a) => (
          <section key={a.opening.id} className="gd-compare__item">
            <div className="gd-card__title">
              <span className="gd-card__company">{a.opening.companyName}</span>
              <span className="gd-card__role">{a.opening.jobRole}</span>
            </div>
            <dl className="gd-compare__list">
              {rows.map((row) => (
                <div key={row.label} className="gd-compare__pair">
                  <dt>{row.label}</dt>
                  <dd>{row.render(a)}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}
