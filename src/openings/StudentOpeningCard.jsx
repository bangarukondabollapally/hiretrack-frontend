import { m } from 'framer-motion';
import { listItemVariants } from '../lib/motion';
import { getOpeningStatus } from './openingStatusHelper';

export function formatDisplayPackage(pkg) {
  if (!pkg) return '';
  const trimmed = pkg.trim();
  if (/^[₹$€₩¥£A$]/.test(trimmed)) return trimmed;
  return `₹ ${trimmed}`;
}

export function formatDeadlineDate(deadline) {
  if (!deadline) return 'Deadline: Rolling';
  const parts = deadline.split('T')[0].split('-');
  let d;
  if (parts.length === 3) {
    d = new Date(parts[0], parts[1] - 1, parts[2]);
  } else {
    d = new Date(deadline);
  }
  if (isNaN(d.getTime())) return `Deadline: ${deadline}`;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `Deadline: ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function getStatusPillInfo(op) {
  const statusInfo = getOpeningStatus(op);
  const isClosed = statusInfo.isClosedOrExpired;

  if (isClosed) {
    return {
      text: statusInfo.status === 'EXPIRED' ? 'Expired' : 'Closed',
      className: 'status-pill status-pill--closed',
      isClosed: true,
      isClosingSoon: false,
    };
  }

  if (!op.deadline) {
    return { text: 'Open', className: 'status-pill status-pill--open', isClosed: false, isClosingSoon: false };
  }

  const parts = op.deadline.split('T')[0].split('-');
  let target;
  if (parts.length === 3) {
    target = new Date(parts[0], parts[1] - 1, parts[2]);
  } else {
    target = new Date(op.deadline);
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffMs = target - today;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 5 && diffDays >= 0) {
    const daysText = diffDays === 0 ? 'today' : `${diffDays}d`;
    return {
      text: diffDays === 0 ? 'Closes today' : `Closing soon (${daysText})`,
      className: 'status-pill status-pill--closing-soon',
      isClosed: false,
      isClosingSoon: true,
    };
  }


  return { text: 'Open', className: 'status-pill status-pill--open', isClosed: false, isClosingSoon: false };
}

export function formatMetaLine1(op) {
  const parts = [];
  if (op.jobType?.trim()) parts.push(op.jobType.trim());
  if (op.workMode?.trim()) parts.push(op.workMode.trim());
  if (op.location?.trim()) parts.push(op.location.trim());
  return parts.join(' · ');
}

export function formatMetaLine2(op) {
  const parts = [];
  if (op.packageDetails?.trim()) {
    parts.push(formatDisplayPackage(op.packageDetails));
  }
  if (op.yearOfStudy?.trim()) {
    parts.push(op.yearOfStudy.trim());
  }
  return parts.join(' · ');
}

export function formatEligibleBranchesCompact(branchesStr) {
  if (!branchesStr || branchesStr === 'ALL') return 'All Branches';
  const list = branchesStr.split(/[,;]/).map((b) => b.trim()).filter(Boolean);
  if (list.length <= 3) return list.join(', ');
  const first3 = list.slice(0, 3).join(', ');
  const extraCount = list.length - 3;
  return `${first3} +${extraCount} more`;
}

export function formatCgpaBacklogsRow(op) {
  const parts = [];
  const minCgpa = op.minCgpa != null ? parseFloat(op.minCgpa) : null;
  if (minCgpa != null && !isNaN(minCgpa) && minCgpa > 0) {
    parts.push(`Min CGPA: ${op.minCgpa}`);
  }
  if (op.maxBacklogs != null && op.maxBacklogs !== '') {
    parts.push(`Max Backlogs: ${op.maxBacklogs}`);
  }
  return parts.join(' • ');
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

  const cgpaBacklogs = formatCgpaBacklogsRow(op);
  if (cgpaBacklogs) {
    parts.push(cgpaBacklogs);
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
  const pillInfo = getStatusPillInfo(op);
  const isClosedOrExpired = pillInfo.isClosed;
  const isTrackingLoading = trackingLoadingId === op.id;

  const degreesText = op.degreeTypes || op.degree || 'All degrees';
  const branchesText = formatEligibleBranchesCompact(op.eligibleBranches);
  const cgpaBacklogsText = formatCgpaBacklogsRow(op);

  return (
    <m.div
      layout
      className={`opening-card ${isClosedOrExpired ? 'opening-card--closed' : ''}`}
      variants={listItemVariants}
      initial={isFromCache ? false : "hidden"}
      animate="visible"
      exit="exit"
    >
      {/* Header: Top row with company name & bookmark button */}
      <div className="opening-card__top-row">
        <h3 className="opening-card__company">{op.companyName}</h3>

        {userRole !== 'ADMIN' && (
          <button
            type="button"
            className={`bookmark-btn ${op.isTracked ? 'bookmark-btn--active' : ''}`}
            disabled={isClosedOrExpired || isTrackingLoading}
            onClick={(e) => onToggleTrack(op, e)}
            aria-label={op.isTracked ? "Remove from saved" : "Save opening"}
            title={op.isTracked ? "Remove from saved" : "Save opening"}
            aria-pressed={!!op.isTracked}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill={op.isTracked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </button>
        )}
      </div>

      {/* Role on full-width line below */}
      <div className="opening-card__role">{op.jobRole}</div>

      {/* Plain text meta lines */}
      <div className="opening-card__meta-lines">
        {formatMetaLine1(op) && (
          <div className="opening-card__meta-line" title={op.location}>
            {formatMetaLine1(op)}
          </div>
        )}
        {formatMetaLine2(op) && (
          <div className="opening-card__meta-line">
            {formatMetaLine2(op)}
          </div>
        )}
      </div>

      {/* Eligibility Block */}
      <div className="opening-card__eligibility-block">
        <div className="opening-card__eligibility-header">Eligibility</div>
        <div className="opening-card__eligibility-grid">
          <div className="eligibility-row">
            <span className="eligibility-key">Degrees:</span>
            <span className="eligibility-val">{degreesText}</span>
          </div>
          <div className="eligibility-row">
            <span className="eligibility-key">Branches:</span>
            <span className="eligibility-val">{branchesText}</span>
          </div>
          {cgpaBacklogsText && (
            <div className="eligibility-row">
              <span className="eligibility-key">Reqs:</span>
              <span className="eligibility-val">{cgpaBacklogsText}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Area pinned to bottom */}
      <div className="opening-card__footer-area">
        <div className="opening-card__deadline-row">
          <span className="opening-card__deadline-text">
            {formatDeadlineDate(op.deadline)}
          </span>
          <span className={pillInfo.className}>
            {pillInfo.text}
          </span>
        </div>

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
      </div>
    </m.div>
  );
}

export function StudentOpeningCardSkeleton() {
  return (
    <div className="opening-card opening-card--skeleton" style={{ opacity: 0.6 }}>
      <div className="opening-card__top-row">
        <div style={{ height: '20px', width: '60%', background: 'var(--border)', borderRadius: '4px' }} />
        <div style={{ height: '36px', width: '36px', background: 'var(--border)', borderRadius: '8px' }} />
      </div>
      <div style={{ height: '16px', width: '40%', background: 'var(--border)', borderRadius: '4px', marginTop: '6px', marginBottom: '12px' }} />
      <div className="opening-card__meta-lines">
        <div style={{ height: '14px', width: '75%', background: 'var(--border)', borderRadius: '4px' }} />
        <div style={{ height: '14px', width: '50%', background: 'var(--border)', borderRadius: '4px', marginTop: '4px' }} />
      </div>
      <div className="opening-card__eligibility-block" style={{ marginTop: '12px' }}>
        <div style={{ height: '12px', width: '30%', background: 'var(--border)', borderRadius: '4px', marginBottom: '6px' }} />
        <div style={{ height: '14px', width: '90%', background: 'var(--border)', borderRadius: '4px', marginBottom: '4px' }} />
        <div style={{ height: '14px', width: '70%', background: 'var(--border)', borderRadius: '4px' }} />
      </div>
      <div className="opening-card__footer-area">
        <div className="opening-card__deadline-row">
          <div style={{ height: '16px', width: '45%', background: 'var(--border)', borderRadius: '4px' }} />
          <div style={{ height: '22px', width: '70px', background: 'var(--border)', borderRadius: '12px' }} />
        </div>
        <div className="opening-card__actions">
          <div style={{ height: '36px', flex: 1, background: 'var(--border)', borderRadius: '8px' }} />
          <div style={{ height: '36px', flex: 1, background: 'var(--border)', borderRadius: '8px' }} />
        </div>
      </div>
    </div>
  );
}
