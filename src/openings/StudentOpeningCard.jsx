import { m } from 'framer-motion';
import { listItemVariants } from '../lib/motion';
import { getOpeningStatus } from './openingStatusHelper';

export function formatDisplayPackage(pkg) {
  if (!pkg) return '';
  const trimmed = pkg.trim();
  if (/^[₹$€₩¥£A$]/.test(trimmed)) return trimmed;
  return `₹ ${trimmed}`;
}

export function formatDeadlineWithCountdown(deadline) {
  if (!deadline) return null;
  const parts = deadline.split('T')[0].split('-');
  let d;
  if (parts.length === 3) {
    d = new Date(parts[0], parts[1] - 1, parts[2]);
  } else {
    d = new Date(deadline);
  }

  if (isNaN(d.getTime())) return { text: `Deadline: ${deadline}`, isExpired: false, isClosingSoon: false };

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const formattedDate = `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);

  const diffMs = target - today;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { text: `Deadline: ${formattedDate} (Expired)`, isExpired: true, isClosingSoon: false };
  } else if (diffDays === 0) {
    return { text: `Deadline: ${formattedDate} • Due today`, isExpired: false, isClosingSoon: true };
  } else if (diffDays === 1) {
    return { text: `Deadline: ${formattedDate} • 1 day left`, isExpired: false, isClosingSoon: true };
  } else if (diffDays <= 3) {
    return { text: `Deadline: ${formattedDate} • ${diffDays} days left`, isExpired: false, isClosingSoon: true };
  } else {
    return { text: `Deadline: ${formattedDate} • ${diffDays} days left`, isExpired: false, isClosingSoon: false };
  }
}

export function formatEligibilityText(op) {
  const parts = [];

  const degrees = (op.degreeTypes || op.degree || '').trim();
  if (degrees) {
    parts.push(`Degrees: ${degrees}`);
  }

  const branches = (op.eligibleBranches === 'ALL' ? 'All Branches' : op.eligibleBranches || '').trim();
  if (branches) {
    parts.push(`Branches: ${branches}`);
  }

  if (op.packageDetails && op.packageDetails.trim()) {
    parts.push(`Package: ${formatDisplayPackage(op.packageDetails)}`);
  }

  if (op.yearOfStudy && op.yearOfStudy.trim() && op.yearOfStudy !== 'All Years') {
    parts.push(`Year: ${op.yearOfStudy}`);
  }

  if (op.minCgpa != null && parseFloat(op.minCgpa) > 0) {
    parts.push(`Min CGPA: ${op.minCgpa}`);
  }

  if (op.maxBacklogs != null && op.maxBacklogs !== '') {
    parts.push(`Max Backlogs: ${op.maxBacklogs}`);
  }

  if (parts.length > 0) {
    return parts.join(' • ');
  }

  return op.eligibility || 'All students eligible';
}

export default function StudentOpeningCard({
  op,
  onViewDetails,
  onToggleTrack,
  trackingLoadingId,
  userRole = 'STUDENT',
  isFromCache = false,
}) {
  const statusInfo = getOpeningStatus(op);
  const isClosedOrExpired = statusInfo.isClosedOrExpired;
  const deadlineInfo = formatDeadlineWithCountdown(op.deadline);
  const isClosingSoon = statusInfo.isClosingSoon || deadlineInfo?.isClosingSoon;

  const statusBadgeText = isClosingSoon && !isClosedOrExpired ? 'CLOSING SOON' : statusInfo.label.toUpperCase();
  const statusBadgeClass = isClosedOrExpired
    ? 'status-badge--closed'
    : isClosingSoon
    ? 'status-badge--closing-soon'
    : 'status-badge--open';

  const isTrackingLoading = trackingLoadingId === op.id;

  return (
    <m.div
      layout
      className={`opening-card ${isClosedOrExpired ? 'opening-card--closed' : ''}`}
      variants={listItemVariants}
      initial={isFromCache ? false : "hidden"}
      animate="visible"
      exit="exit"
    >
      <div className="opening-card__header">
        <div className="opening-card__title-area">
          <h3 className="opening-card__company">{op.companyName}</h3>
          <div className="opening-card__role">{op.jobRole}</div>
        </div>

        <div className="opening-card__header-actions">
          <span className={`status-badge ${statusBadgeClass}`}>
            {statusBadgeText}
          </span>

          {userRole !== 'ADMIN' && (
            <button
              type="button"
              className={`bookmark-btn ${op.isTracked ? 'bookmark-btn--active' : ''}`}
              disabled={isClosedOrExpired || isTrackingLoading}
              onClick={(e) => onToggleTrack(op, e)}
              aria-label={op.isTracked ? "Untrack opening" : "Track opening"}
              title={op.isTracked ? "Untrack opening" : "Track opening"}
              aria-pressed={!!op.isTracked}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill={op.isTracked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="opening-card__tags">
        {op.jobType && <span className="meta-tag">{op.jobType}</span>}
        {op.workMode && <span className="meta-tag">{op.workMode}</span>}
        {op.location && (
          <span className="meta-tag">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            {op.location}
          </span>
        )}
      </div>

      <div className="opening-card__eligibility">
        <span className="eligibility-label">Eligibility:</span>{' '}
        <span className="eligibility-text">{formatEligibilityText(op)}</span>
      </div>

      {op.deadline && (
        <div className={`opening-card__deadline ${deadlineInfo?.isExpired ? 'deadline--expired' : isClosingSoon ? 'deadline--closing-soon' : ''}`}>
          {deadlineInfo?.text || `Deadline: ${op.deadline}`}
        </div>
      )}

      <div className="opening-card__actions">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => onViewDetails(op)}
        >
          View details
        </button>

        {op.applicationLink && (
          <a
            href={op.applicationLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            Apply on Portal ↗
          </a>
        )}
      </div>
    </m.div>
  );
}

export function StudentOpeningCardSkeleton() {
  return (
    <div className="opening-card opening-card--skeleton" style={{ opacity: 0.6 }}>
      <div className="opening-card__header">
        <div className="opening-card__title-area" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ height: '18px', width: '65%', background: 'var(--border)', borderRadius: '4px' }} />
          <div style={{ height: '14px', width: '45%', background: 'var(--border)', borderRadius: '4px' }} />
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ height: '24px', width: '70px', background: 'var(--border)', borderRadius: '4px' }} />
          <div style={{ height: '36px', width: '36px', background: 'var(--border)', borderRadius: '8px' }} />
        </div>
      </div>
      <div className="opening-card__tags" style={{ marginTop: '8px' }}>
        <div style={{ height: '26px', width: '80px', background: 'var(--border)', borderRadius: '6px' }} />
        <div style={{ height: '26px', width: '70px', background: 'var(--border)', borderRadius: '6px' }} />
      </div>
      <div className="opening-card__eligibility" style={{ background: 'var(--surface-sunken)', height: '52px', marginTop: '8px' }} />
      <div style={{ height: '16px', width: '50%', background: 'var(--border)', marginTop: 'auto', borderRadius: '4px' }} />
      <div className="opening-card__actions" style={{ marginTop: '12px' }}>
        <div style={{ height: '36px', flex: 1, background: 'var(--border)', borderRadius: '8px' }} />
        <div style={{ height: '36px', flex: 1, background: 'var(--border)', borderRadius: '8px' }} />
      </div>
    </div>
  );
}
