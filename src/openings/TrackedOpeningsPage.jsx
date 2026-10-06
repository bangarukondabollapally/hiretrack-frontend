import { useState, useEffect, useRef } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AnimatePresence, m } from 'framer-motion';
import { useAuth } from '../auth/AuthContext';
import { useTrackedOpeningsQuery, trackOpeningApi, untrackOpeningApi, invalidateOpeningQueries } from '../api/queries';
import QueryStateNotice from '../components/QueryStateNotice';
import { getOpeningStatus } from './openingStatusHelper';
import { modalBackdropVariants, modalCardVariants, listItemVariants } from '../lib/motion';
import './OpeningsPage.css';

function formatDisplayPackage(pkg) {
  if (!pkg) return '';
  const trimmed = pkg.trim();
  if (/^[₹$€₩¥£A$]/.test(trimmed)) return trimmed;
  return `₹ ${trimmed}`;
}

function formatDeadlineWithCountdown(deadline) {
  if (!deadline) return null;
  const parts = deadline.split('T')[0].split('-');
  let d;
  if (parts.length === 3) {
    d = new Date(parts[0], parts[1] - 1, parts[2]);
  } else {
    d = new Date(deadline);
  }

  if (isNaN(d.getTime())) return `Deadline: ${deadline}`;

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

function formatPublishedBy(name) {
  if (!name) return 'Published by: Placement Cell';
  if (name.toLowerCase().includes('placement cell')) {
    return `Published by: ${name}`;
  }
  return `Published by: ${name} Placement Cell`;
}

export default function TrackedOpeningsPage() {
  const { user } = useAuth();
  const userId = user?.userId || user?.id || user?.email;

  const [searchQuery, setSearchQuery] = useState('');
  const [includeClosed, setIncludeClosed] = useState(true);
  const [selectedOpening, setSelectedOpening] = useState(null);
  const [trackingLoadingId, setTrackingLoadingId] = useState(null);
  const [trackError, setTrackError] = useState('');

  const {
    data: trackedData,
    isLoading: isTrackedLoading,
    isFetching,
    isError,
    error: trackedErr,
    refetch,
  } = useTrackedOpeningsQuery(userId);

  const lastFocusedElementRef = useRef(null);

  useEffect(() => {
    if (!selectedOpening) return;
    lastFocusedElementRef.current = document.activeElement;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setSelectedOpening(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (
        lastFocusedElementRef.current &&
        document.body.contains(lastFocusedElementRef.current) &&
        typeof lastFocusedElementRef.current.focus === 'function'
      ) {
        lastFocusedElementRef.current.focus();
      }
    };
  }, [selectedOpening]);

  // Redirect admin users to admin manage page
  if (user?.role === 'ADMIN') {
    return <Navigate to="/admin/openings" replace />;
  }

  const trackedOpenings = trackedData || [];
  const isLoading = isTrackedLoading && !trackedData;
  const isFromCache = !isTrackedLoading && !!trackedData;

  const filteredOpenings = trackedOpenings.filter((op) => {
    const statusInfo = getOpeningStatus(op);
    if (!includeClosed && statusInfo.isClosedOrExpired) return false;
    const q = searchQuery.toLowerCase();
    return (
      op.companyName?.toLowerCase().includes(q) ||
      op.jobRole?.toLowerCase().includes(q) ||
      op.location?.toLowerCase().includes(q) ||
      op.jobType?.toLowerCase().includes(q)
    );
  });

  const handleToggleTrack = async (opening, e) => {
    e?.stopPropagation();
    setTrackingLoadingId(opening.id);
    setTrackError('');

    try {
      if (opening.isTracked) {
        await untrackOpeningApi(opening.id);
      } else {
        await trackOpeningApi(opening.id);
      }
      invalidateOpeningQueries(userId);
      if (selectedOpening?.id === opening.id) {
        setSelectedOpening((prev) => prev ? { ...prev, isTracked: !prev.isTracked } : null);
      }
    } catch (_err) {
      setTrackError('Failed to update tracking state. Please try again.');
      setTimeout(() => setTrackError(''), 4000);
    } finally {
      setTrackingLoadingId(null);
    }
  };

  return (
    <div className="openings-page">
      <QueryStateNotice
        isFetching={isFetching && !isLoading}
        isError={isError && trackedOpenings.length > 0}
        error={trackedErr}
        refetch={refetch}
      />

      <div className="openings-header">
        <div>
          <h1 className="openings-title">Tracked Openings</h1>
          <p className="openings-subtitle">Campus openings you are currently tracking.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Link to="/openings" className="btn-secondary" style={{ textDecoration: 'none', fontSize: '0.85rem' }}>
            All Openings
          </Link>
        </div>
      </div>

      {trackError && (
        <div className="openings-error" role="alert" style={{ marginBottom: '1rem' }}>
          {trackError}
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="openings-toolbar">
        <div className="openings-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search tracked openings by company, role, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <label className="openings-toggle">
          <input
            type="checkbox"
            checked={includeClosed}
            onChange={(e) => setIncludeClosed(e.target.checked)}
          />
          <span>Include closed openings</span>
        </label>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="openings-loading">
          <span className="spinner" />
          <span>Loading tracked openings...</span>
        </div>
      )}

      {/* Error State */}
      {isError && trackedOpenings.length === 0 && (
        <div className="openings-error" role="alert">
          Failed to load tracked openings. Please try again.
          <button type="button" onClick={() => refetch()} className="btn-retry">Retry</button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && filteredOpenings.length === 0 && (
        <div className="openings-empty">
          <div className="empty-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h3>{searchQuery ? 'No matching tracked openings' : 'No tracked openings yet'}</h3>
          <p>
            {searchQuery
              ? 'Try adjusting your search query.'
              : 'Browse campus placement openings and click "Track" on any opening to save it here for quick access.'}
          </p>
          {!searchQuery && (
            <div style={{ marginTop: '1.25rem' }}>
              <Link to="/openings" className="btn-primary" style={{ textDecoration: 'none' }}>
                Browse Placement Openings
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Openings Grid */}
      {!isLoading && filteredOpenings.length > 0 && (
        <div className="openings-grid">
          <AnimatePresence>
            {filteredOpenings.map((op) => {
              const statusInfo = getOpeningStatus(op);
              const isClosedOrExpired = statusInfo.isClosedOrExpired;
              const deadlineInfo = formatDeadlineWithCountdown(op.deadline);
              const isClosingSoon = statusInfo.isClosingSoon || deadlineInfo?.isClosingSoon;

              return (
                <m.div
                  key={op.id}
                  layout
                  className={`opening-card ${isClosedOrExpired ? 'opening-card--muted' : ''}`}
                  style={{ opacity: isClosedOrExpired ? 0.7 : 1 }}
                  variants={listItemVariants}
                  initial={isFromCache ? false : "hidden"}
                  animate="visible"
                  exit="exit"
                  whileTap={isClosedOrExpired ? {} : { scale: 0.98 }}
                >
                  <div className="opening-card__header">
                    <div>
                      <h3 className="opening-card__company">{op.companyName}</h3>
                      <div className="opening-card__role">{op.jobRole}</div>
                    </div>
                    <span className={`status-badge ${isClosedOrExpired ? 'status-badge--closed' : isClosingSoon ? 'status-badge--closing-soon' : 'status-badge--open'}`}>
                      {isClosingSoon && !isClosedOrExpired ? 'CLOSING SOON' : statusInfo.label.toUpperCase()}
                    </span>
                  </div>

                  <div className="opening-card__details">
                    {op.jobType && (
                      <span className="opening-card__detail-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                        </svg>
                        {op.jobType}
                      </span>
                    )}

                    {op.workMode && (
                      <span className="opening-card__detail-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        </svg>
                        {op.workMode}
                      </span>
                    )}

                    {op.packageDetails && (
                      <span className="opening-card__detail-item opening-card__detail-item--highlight">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="12" y1="1" x2="12" y2="23" />
                          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
                        {formatDisplayPackage(op.packageDetails)}
                      </span>
                    )}

                    {op.location && (
                      <span className="opening-card__detail-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        {op.location}
                      </span>
                    )}

                    {op.yearOfStudy && op.yearOfStudy !== 'All Years' && (
                      <span className="opening-card__detail-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                          <path d="M6 12v5c3 3 9 3 12 0v-5" />
                        </svg>
                        {op.yearOfStudy}
                      </span>
                    )}
                  </div>

                  {op.eligibility && (
                    <div className="opening-card__eligibility">
                      <strong>Eligibility:</strong> {op.eligibility}
                    </div>
                  )}

                  {deadlineInfo && (
                    <div className={`opening-card__deadline ${deadlineInfo.isExpired ? 'deadline--expired' : deadlineInfo.isClosingSoon ? 'deadline--urgent' : ''}`}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      {deadlineInfo.text}
                    </div>
                  )}

                  <div className="opening-card__footer">
                    <span className="published-by">{formatPublishedBy(op.publishedBy)}</span>
                    <div className="opening-card__actions">
                      <button
                        type="button"
                        className={`btn-sm ${op.isTracked ? 'btn-secondary btn-tracked' : 'btn-primary'}`}
                        disabled={trackingLoadingId === op.id}
                        onClick={(e) => handleToggleTrack(op, e)}
                        title={op.isTracked ? 'Click to untrack' : 'Track opening'}
                      >
                        {trackingLoadingId === op.id ? (
                          <span className="spinner spinner-sm" />
                        ) : op.isTracked ? (
                          '✓ Tracked'
                        ) : (
                          'Track'
                        )}
                      </button>

                      <button
                        type="button"
                        className="btn-sm btn-secondary"
                        onClick={() => setSelectedOpening(op)}
                      >
                        View details
                      </button>

                      {op.applicationLink && !isClosedOrExpired && (
                        <a
                          href={op.applicationLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-sm btn-primary"
                        >
                          Apply now ↗
                        </a>
                      )}
                    </div>
                  </div>
                </m.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Opening Details Modal */}
      <AnimatePresence>
        {selectedOpening && (() => {
          const modalStatus = getOpeningStatus(selectedOpening);
          const modalDeadline = formatDeadlineWithCountdown(selectedOpening.deadline);
          const modalClosingSoon = modalStatus.isClosingSoon || modalDeadline?.isClosingSoon;

          return (
            <m.div
              className="modal-overlay"
              variants={modalBackdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => setSelectedOpening(null)}
            >
              <m.div
                className="modal-content opening-modal"
                variants={modalCardVariants}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-labelledby="modal-title"
                tabIndex={-1}
              >
                <div className="modal-header">
                  <div>
                    <h2 id="modal-title" className="modal-title">{selectedOpening.companyName}</h2>
                    <p className="modal-subtitle">{selectedOpening.jobRole}</p>
                  </div>
                  <button
                    type="button"
                    className="modal-close"
                    onClick={() => setSelectedOpening(null)}
                    aria-label="Close modal"
                  >
                    ×
                  </button>
                </div>

                <div className="modal-body">
                  <div className="modal-meta-grid">
                    {selectedOpening.jobType && (
                      <div className="meta-item">
                        <span className="meta-label">Job type</span>
                        <span className="meta-value">{selectedOpening.jobType}</span>
                      </div>
                    )}
                    {selectedOpening.workMode && (
                      <div className="meta-item">
                        <span className="meta-label">Work mode</span>
                        <span className="meta-value">{selectedOpening.workMode}</span>
                      </div>
                    )}
                    {selectedOpening.packageDetails && (
                      <div className="meta-item">
                        <span className="meta-label">Package / Stipend</span>
                        <span className="meta-value highlight">{formatDisplayPackage(selectedOpening.packageDetails)}</span>
                      </div>
                    )}
                    {selectedOpening.location && (
                      <div className="meta-item">
                        <span className="meta-label">Location</span>
                        <span className="meta-value">{selectedOpening.location}</span>
                      </div>
                    )}
                    {selectedOpening.seats != null && (
                      <div className="meta-item">
                        <span className="meta-label">Seats / Openings</span>
                        <span className="meta-value">{selectedOpening.seats}</span>
                      </div>
                    )}
                    {selectedOpening.yearOfStudy && (
                      <div className="meta-item">
                        <span className="meta-label">Eligible year</span>
                        <span className="meta-value">{selectedOpening.yearOfStudy}</span>
                      </div>
                    )}
                    <div className="meta-item">
                      <span className="meta-label">Status</span>
                      <span className={`status-badge ${modalStatus.isClosedOrExpired ? 'status-badge--closed' : modalClosingSoon ? 'status-badge--closing-soon' : 'status-badge--open'}`}>
                        {modalClosingSoon && !modalStatus.isClosedOrExpired ? 'CLOSING SOON' : modalStatus.label.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {selectedOpening.eligibility && (
                    <div className="modal-section">
                      <h4>Eligibility Criteria</h4>
                      <p>{selectedOpening.eligibility}</p>
                    </div>
                  )}

                  {modalDeadline && (
                    <div className="modal-section">
                      <h4>Application Deadline</h4>
                      <p className={modalDeadline.isExpired ? 'deadline--expired' : modalDeadline.isClosingSoon ? 'deadline--urgent' : ''}>
                        {modalDeadline.text}
                      </p>
                    </div>
                  )}

                  {selectedOpening.description && (
                    <div className="modal-section">
                      <h4>Short JD</h4>
                      <p style={{ whitespace: 'pre-line' }}>{selectedOpening.description}</p>
                    </div>
                  )}

                  <div className="modal-section">
                    <span className="published-by">{formatPublishedBy(selectedOpening.publishedBy)}</span>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className={`btn-sm ${selectedOpening.isTracked ? 'btn-secondary btn-tracked' : 'btn-primary'}`}
                    disabled={trackingLoadingId === selectedOpening.id}
                    onClick={(e) => handleToggleTrack(selectedOpening, e)}
                  >
                    {selectedOpening.isTracked ? '✓ Tracked' : 'Track'}
                  </button>

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setSelectedOpening(null)}
                  >
                    Close
                  </button>

                  {selectedOpening.applicationLink && !modalStatus.isClosedOrExpired && (
                    <a
                      href={selectedOpening.applicationLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary"
                    >
                      Apply on Company Site ↗
                    </a>
                  )}
                </div>
              </m.div>
            </m.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
