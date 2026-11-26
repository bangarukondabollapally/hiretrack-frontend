import { useId, useState } from 'react';
import {
  AVAILABILITY_LABELS,
  ELIGIBILITY_LABELS,
  READINESS_LABELS,
  formatDeadline,
  labelFor,
  skillSummary,
} from './guidanceLabels';
import ReadinessPanel from './ReadinessPanel';

/**
 * Compact card for one HireTrack opening with its verified readiness.
 * Primary actions (readiness, skill plan) sit on one row; selection for
 * comparison and the details toggle sit in a quieter footer row.
 */
export default function OpeningCard({ assessment, onAction, isSelected, onToggleCompare, canSelectMore, disabled }) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const { opening, readiness, eligibility, counts } = assessment;
  const level = labelFor(READINESS_LABELS, readiness.level);
  const elig = labelFor(ELIGIBILITY_LABELS, eligibility.verdict);
  const availability = AVAILABILITY_LABELS[opening.availability];
  const deadline = formatDeadline(opening.deadline);
  const meta = [opening.jobType, opening.location, opening.workMode, opening.packageDetails].filter(Boolean);
  const isOpen = opening.availability === 'OPEN';
  const relation = opening.applicationId ? 'Applied' : opening.tracked ? 'Tracked' : null;

  return (
    <article className={`gd-card ${isSelected ? 'gd-card--selected' : ''}`} aria-label={`${opening.companyName}, ${opening.jobRole}`}>
      <div className="gd-card__head">
        <div className="gd-card__title">
          <span className="gd-card__company">{opening.companyName}</span>
          <span className="gd-card__role">{opening.jobRole}</span>
        </div>
        <span className={`gd-pill gd-pill--${level.tone}`}>{level.label}</span>
      </div>

      {meta.length > 0 && <div className="gd-card__meta">{meta.join(' · ')}</div>}

      <div className="gd-card__facts">
        <span className={`gd-dot gd-dot--${elig.tone}`}>{elig.label}</span>
        <span>{skillSummary(counts)}</span>
      </div>

      {(availability || deadline || relation) && (
        <div className="gd-card__facts">
          {availability ? <span className="gd-card__warn">{availability}</span> : deadline && <span>{deadline}</span>}
          {relation && <span className="gd-tag">{relation}</span>}
        </div>
      )}

      <div className="gd-card__actions">
        <button type="button" className="gd-btn" disabled={disabled} onClick={() => onAction('readiness', opening)}>
          Check readiness
        </button>
        <button type="button" className="gd-btn" disabled={disabled} onClick={() => onAction('upskill', opening)}>
          Skill plan
        </button>
      </div>

      <div className="gd-card__footer">
        {onToggleCompare && isOpen ? (
          <label className={`gd-compare-toggle ${!isSelected && !canSelectMore ? 'gd-compare-toggle--disabled' : ''}`}>
            <input
              type="checkbox"
              checked={!!isSelected}
              disabled={disabled || (!isSelected && !canSelectMore)}
              onChange={() => onToggleCompare(opening)}
            />
            Compare
          </label>
        ) : (
          <span />
        )}
        <button
          type="button"
          className="gd-btn gd-btn--ghost"
          aria-expanded={expanded}
          aria-controls={detailsId}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Hide details ▴' : 'Details ▾'}
        </button>
      </div>

      {expanded && (
        <div className="gd-card__details" id={detailsId}>
          {opening.description && <p className="gd-card__desc">{opening.description}</p>}
          <ReadinessPanel assessment={assessment} compact />
          {isOpen && opening.applicationLink && (
            <a className="gd-link" href={opening.applicationLink} target="_blank" rel="noopener noreferrer">
              Open application page ↗
            </a>
          )}
        </div>
      )}
    </article>
  );
}
