import { m } from 'framer-motion';
import { listItemVariants } from '../lib/motion';
import { formatYearOfStudy, formatPublishedBy } from '../openings/openingStatusHelper';

function formatDisplayPackage(pkg) {
  if (!pkg) return '';
  const trimmed = pkg.trim();
  if (/^[₹$€₩¥£A$]/.test(trimmed)) return trimmed;
  return `₹ ${trimmed}`;
}

export default function AdminOpeningCard({ opening, onEdit, onClose, onReopen, onDelete }) {
  const isClosed = opening.status === 'CLOSED';

  return (
    <m.div
      layout
      variants={listItemVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={`admin-opening-card ${isClosed ? 'admin-opening-card--closed' : ''}`}
    >
      <div className="admin-card__top">
        <div>
          <h3 className="admin-card__company">{opening.companyName}</h3>
          <div className="admin-card__role">{opening.jobRole}</div>
        </div>
        <span className={`status-badge ${isClosed ? 'status-badge--closed' : 'status-badge--open'}`}>
          {opening.status}
        </span>
      </div>

      <div className="admin-card__meta">
        {opening.jobType && <span className="meta-tag">{opening.jobType}</span>}
        {opening.workMode && <span className="meta-tag">{opening.workMode}</span>}
        {opening.location && (
          <span className="meta-tag">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '3px' }}>
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            {opening.location}
          </span>
        )}
        {opening.packageDetails && (
          <span className="meta-tag meta-tag--package">
            {formatDisplayPackage(opening.packageDetails)}
          </span>
        )}
        {opening.seats != null && opening.seats > 0 && (
          <span className="meta-tag meta-tag--seats">
            Seats: {opening.seats}
          </span>
        )}
        {opening.yearOfStudy && (
          <span className="meta-tag">
            {formatYearOfStudy(opening.yearOfStudy)}
          </span>
        )}
        {opening.minCgpa != null && (
          <span className="meta-tag">
            Min CGPA: {opening.minCgpa}
          </span>
        )}
        {opening.maxBacklogs != null && (
          <span className="meta-tag">
            Max Backlogs: {opening.maxBacklogs}
          </span>
        )}
        {opening.deadline && <span className="meta-tag">Deadline: {opening.deadline}</span>}
        <span className="meta-tag meta-tag--published">
          {formatPublishedBy(opening.publishedBy)}
        </span>
      </div>

      {opening.eligibleBranches && (
        <div className="admin-card__eligibility">
          <strong>Eligibility:</strong> {opening.eligibleBranches === 'ALL' ? 'All Branches' : opening.eligibleBranches}
          {opening.degree ? ` (${opening.degree})` : ''}
        </div>
      )}

      {opening.description && (
        <div className="admin-card__jd-preview">
          <strong>Short JD:</strong> {opening.description.length > 120 ? `${opening.description.slice(0, 120)}...` : opening.description}
        </div>
      )}

      <div className="admin-card__actions">
        <button
          type="button"
          className="btn-secondary btn-sm"
          onClick={() => onEdit(opening)}
        >
          Edit
        </button>

        {isClosed ? (
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => onReopen(opening)}
          >
            Reopen
          </button>
        ) : (
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => onClose(opening)}
          >
            Close
          </button>
        )}

        <button
          type="button"
          className="btn-danger btn-sm"
          onClick={() => onDelete(opening)}
        >
          Delete
        </button>
      </div>
    </m.div>
  );
}
