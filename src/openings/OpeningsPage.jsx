import { useState, useEffect, useRef } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AnimatePresence, m } from 'framer-motion';
import { useAuth } from '../auth/AuthContext';
import { useOpeningsQuery, trackOpeningApi, untrackOpeningApi, invalidateOpeningQueries } from '../api/queries';
import QueryStateNotice from '../components/QueryStateNotice';
import { getOpeningStatus, formatYearOfStudy, formatPublishedBy } from './openingStatusHelper';
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

export default function OpeningsPage() {
  const { user } = useAuth();
  const userId = user?.userId || user?.id || user?.email;

  const [searchQuery, setSearchQuery] = useState('');
  const [includeClosed, setIncludeClosed] = useState(false);
  const [selectedOpening, setSelectedOpening] = useState(null);
  const [trackingLoadingId, setTrackingLoadingId] = useState(null);
  const [trackError, setTrackError] = useState('');

  const {
    data: openingsData,
    isLoading: isOpLoading,
    isFetching,
    isError,
    error: opErr,
    refetch,
  } = useOpeningsQuery(userId, includeClosed);

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

  // Item 6: ADMIN visiting /openings redirects to /admin/openings
  if (user?.role === 'ADMIN') {
    return <Navigate to="/admin/openings" replace />;
  }

  const openings = openingsData || [];
  const isLoading = isOpLoading && !openingsData;
  const isFromCache = !isOpLoading && !!openingsData;

  const filteredOpenings = openings.filter(op => {
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
    const statusInfo = getOpeningStatus(opening);
    if (statusInfo.isClosedOrExpired) return;

    setTrackingLoadingId(opening.id);
    setTrackError('');

    try {
      if (opening.isTracked) {
        await untrackOpeningApi(opening.id);
      } else {
        await trackOpeningApi(opening.id);
      }
      invalidateOpeningQueries(userId);
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
        isError={isError && openings.length > 0}
        error={opErr}
        refetch={refetch}
      />

      <div className="openings-header">
        <div>
          <h1 className="openings-title">Placement openings</h1>
          <p className="openings-subtitle">Campus openings posted by your placement cell.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Link to="/tracked-openings" className="btn-secondary" style={{ textDecoration: 'none', fontSize: '0.85rem' }}>
            View Tracked Openings →
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
            placeholder="Search by company, role, or location..."
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
          <span>Show closed openings</span>
        </label>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="openings-loading">
          <span className="spinner" />
          <span>Loading placement openings...</span>
        </div>
      )}

      {/* Error State */}
      {isError && openings.length === 0 && (
        <div className="openings-error" role="alert">
          Failed to load placement openings. Please try again.
          <button type="button" onClick={() => refetch()} className="btn-retry">Retry</button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && filteredOpenings.length === 0 && (
        <div className="openings-empty">
          <div className="empty-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 13.255A23.931 23.931 0 0 1 12 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2m4 6h.01M5 20h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z" />
            </svg>
          </div>
          <h3>No openings found</h3>
          <p>{searchQuery ? 'Try adjusting your search filters.' : 'No openings right now. New ones from your placement cell will appear here.'}</p>
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

                  <div className="opening-card__meta">
                    {op.jobType && <span className="meta-tag">{op.jobType}</span>}
                    {op.workMode && <span className="meta-tag">{op.workMode}</span>}
                    {op.location && (
                      <span className="meta-tag">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '3px' }}>
                          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                          <circle cx="12" cy="10" r="3"/>
                        </svg>
                        {op.location}
                      </span>
                    )}
                    {op.packageDetails && (
                      <span className="meta-tag meta-tag--package">
                        {formatDisplayPackage(op.packageDetails)}
                      </span>
                    )}
                    {op.seats != null && op.seats > 0 && (
                      <span className="meta-tag meta-tag--seats">
                        Seats: {op.seats}
                      </span>
                    )}
                    {op.yearOfStudy && (
                      <span className="meta-tag">
                        {formatYearOfStudy(op.yearOfStudy)}
                      </span>
                    )}
                    {op.minCgpa != null && (
                      <span className="meta-tag">
                        Min CGPA: {op.minCgpa}
                      </span>
                    )}
                    {op.maxBacklogs != null && (
                      <span className="meta-tag">
                        Max Backlogs: {op.maxBacklogs}
                      </span>
                    )}
                    <span className="meta-tag meta-tag--published">
                      {formatPublishedBy(op.publishedBy)}
                    </span>
                  </div>

                  {(op.eligibleBranches || op.minCgpa != null || op.maxBacklogs != null) && (
                    <p className="opening-card__eligibility">
                      <strong>Eligibility:</strong> {op.eligibleBranches === 'ALL' ? 'All Branches' : op.eligibleBranches}
                      {op.degree ? ` (${op.degree})` : ''}
                      {op.minCgpa != null && ` • Min CGPA: ${op.minCgpa}`}
                      {op.maxBacklogs != null && ` • Max Backlogs: ${op.maxBacklogs}`}
                    </p>
                  )}

                  {op.deadline && (
                    <div className={`opening-card__deadline ${deadlineInfo?.isExpired ? 'deadline--expired' : isClosingSoon ? 'deadline--closing-soon' : ''}`}>
                      {deadlineInfo?.text || `Deadline: ${op.deadline}`}
                    </div>
                  )}

                  <div className="opening-card__actions">
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      onClick={() => setSelectedOpening(op)}
                    >
                      View details
                    </button>

                    {op.applicationLink && (
                      <a
                        href={op.applicationLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary btn-sm"
                      >
                        Apply on Portal ↗
                      </a>
                    )}

                    {user?.role !== 'ADMIN' && (
                      <button
                        type="button"
                        className={`btn-sm ${op.isTracked ? 'btn-secondary btn-tracked' : 'btn-primary'}`}
                        disabled={isClosedOrExpired || trackingLoadingId === op.id}
                        title={statusInfo.reason || ''}
                        onClick={(e) => handleToggleTrack(op, e)}
                      >
                        {trackingLoadingId === op.id ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <span className="spinner spinner-sm" style={{ width: '12px', height: '12px' }} />
                            Updating...
                          </span>
                        ) : op.isTracked ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            ✓ Tracked
                          </span>
                        ) : (
                          'Track'
                        )}
                      </button>
                    )}
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
          return (
            <m.div
              className="modal-backdrop"
              variants={modalBackdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => setSelectedOpening(null)}
            >
              <m.div
                className="modal-card modal-card--lg"
                variants={modalCardVariants}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <div>
                    <h2>{selectedOpening.companyName}</h2>
                    <p className="modal-subtitle">{selectedOpening.jobRole}</p>
                  </div>
                  <button
                    type="button"
                    className="modal-close"
                    onClick={() => setSelectedOpening(null)}
                  >
                    ✕
                  </button>
                </div>

                <div className="modal-body">
                  <div className="opening-detail-meta">
                    <div><strong>Job Type:</strong> {selectedOpening.jobType || 'N/A'}</div>
                    <div><strong>Work Mode:</strong> {selectedOpening.workMode || 'N/A'}</div>
                    <div><strong>Location:</strong> {selectedOpening.location || 'N/A'}</div>
                    <div><strong>Package/Stipend:</strong> {formatDisplayPackage(selectedOpening.packageDetails) || 'N/A'}</div>
                    <div><strong>Seats:</strong> {selectedOpening.seats != null ? selectedOpening.seats : 'Unlimited'}</div>
                    <div><strong>Year of Study:</strong> {selectedOpening.yearOfStudy || 'All Years'}</div>
                    <div><strong>Deadline:</strong> {selectedOpening.deadline || 'Rolling'}</div>
                    <div><strong>Published by:</strong> {formatPublishedBy(selectedOpening.publishedBy)}</div>
                    <div>
                      <strong>Status: </strong>
                      <span className={`status-badge ${modalStatus.isClosedOrExpired ? 'status-badge--closed' : 'status-badge--open'}`}>
                        {modalStatus.label.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {selectedOpening.eligibleBranches && (
                    <div className="opening-detail-section">
                      <h4>Eligibility criteria</h4>
                      <p><strong>Branches:</strong> {selectedOpening.eligibleBranches === 'ALL' ? 'All Branches' : selectedOpening.eligibleBranches}</p>
                      {selectedOpening.eligibilityNote && <p><strong>Note:</strong> {selectedOpening.eligibilityNote}</p>}
                    </div>
                  )}

                  {selectedOpening.description && (
                    <div className="opening-detail-section">
                      <h4>Mini JD</h4>
                      <div className="opening-description-text">{selectedOpening.description}</div>
                    </div>
                  )}
                </div>

                <div className="modal-footer">
                  {selectedOpening.applicationLink && (
                    <a
                      href={selectedOpening.applicationLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary"
                    >
                      Apply on portal ↗
                    </a>
                  )}

                  {user?.role !== 'ADMIN' && (
                    <button
                      type="button"
                      className={`btn-sm ${selectedOpening.isTracked ? 'btn-secondary btn-tracked' : 'btn-primary'}`}
                      disabled={modalStatus.isClosedOrExpired || trackingLoadingId === selectedOpening.id}
                      onClick={(e) => handleToggleTrack(selectedOpening, e)}
                    >
                      {selectedOpening.isTracked ? '✓ Tracked' : 'Track'}
                    </button>
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
