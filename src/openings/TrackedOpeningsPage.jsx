import { useState, useEffect, useRef } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AnimatePresence, m } from 'framer-motion';
import { useAuth } from '../auth/AuthContext';
import { useTrackedOpeningsQuery, trackOpeningApi, untrackOpeningApi, invalidateOpeningQueries } from '../api/queries';
import QueryStateNotice from '../components/QueryStateNotice';
import { getOpeningStatus } from './openingStatusHelper';
import StudentOpeningCard, {
  StudentOpeningCardSkeleton,
  formatDisplayPackage,
  formatDeadlineDate,
  getStatusPillInfo,
} from './StudentOpeningCard';
import { modalBackdropVariants, modalCardVariants } from '../lib/motion';
import { useScrollLock } from '../hooks/useScrollLock';
import './OpeningsPage.css';


export default function TrackedOpeningsPage() {
  const { user } = useAuth();
  const userId = user?.userId || user?.id || user?.email;

  const [searchQuery, setSearchQuery] = useState('');
  const [includeClosed, setIncludeClosed] = useState(true);
  const [selectedOpening, setSelectedOpening] = useState(null);
  const [trackingLoadingId, setTrackingLoadingId] = useState(null);
  const [trackError, setTrackError] = useState('');

  const modalRef = useRef(null);
  useScrollLock(Boolean(selectedOpening), modalRef);


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

      {/* Loading State Skeleton */}
      {isLoading && (
        <div className="openings-grid">
          {Array.from({ length: 6 }).map((_, idx) => (
            <StudentOpeningCardSkeleton key={idx} />
          ))}
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
              : 'Browse campus placement openings and click the bookmark icon on any opening to track it here.'}
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
            {filteredOpenings.map((op) => (
              <StudentOpeningCard
                key={op.id}
                op={op}
                onViewDetails={setSelectedOpening}
                onToggleTrack={handleToggleTrack}
                trackingLoadingId={trackingLoadingId}
                userRole={user?.role}
                isFromCache={isFromCache}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Opening Details Modal */}
      <AnimatePresence>
        {selectedOpening && (() => {
          const pillInfo = getStatusPillInfo(selectedOpening);

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
                ref={modalRef}
                className="modal-card modal-card--lg"
                variants={modalCardVariants}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
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
                    ✕
                  </button>
                </div>

                <div className="modal-body">
                  <div className="opening-detail-meta">
                    <div><strong>Job Type:</strong> {selectedOpening.jobType || 'N/A'}</div>
                    <div><strong>Work Mode:</strong> {selectedOpening.workMode || 'N/A'}</div>
                    <div><strong>Location:</strong> {selectedOpening.location || 'N/A'}</div>
                    <div><strong>Package/Stipend:</strong> {formatDisplayPackage(selectedOpening.packageDetails) || 'N/A'}</div>
                    <div><strong>Year of Study:</strong> {selectedOpening.yearOfStudy || 'All Years'}</div>
                    <div><strong>Deadline:</strong> {formatDeadlineDate(selectedOpening.deadline)}</div>
                    <div>
                      <strong>Status: </strong>
                      <span className={pillInfo.className}>
                        {pillInfo.text}
                      </span>
                    </div>
                  </div>

                  <div className="opening-detail-section">
                    <h4>Eligibility Criteria</h4>
                    <p><strong>Degrees:</strong> {selectedOpening.degreeTypes || selectedOpening.degree || 'All degrees'}</p>
                    <p><strong>Branches:</strong> {selectedOpening.eligibleBranches === 'ALL' ? 'All Branches' : (selectedOpening.eligibleBranches || 'All Branches')}</p>
                    {selectedOpening.minCgpa != null && parseFloat(selectedOpening.minCgpa) > 0 && (
                      <p><strong>Min CGPA:</strong> {selectedOpening.minCgpa}</p>
                    )}
                    {selectedOpening.maxBacklogs != null && selectedOpening.maxBacklogs !== '' && (
                      <p><strong>Max Backlogs:</strong> {selectedOpening.maxBacklogs}</p>
                    )}
                    {selectedOpening.eligibilityNote && <p><strong>Note:</strong> {selectedOpening.eligibilityNote}</p>}
                  </div>

                  {selectedOpening.description && (
                    <div className="opening-detail-section">
                      <h4>Mini JD</h4>
                      <div className="opening-description-text">{selectedOpening.description}</div>
                    </div>
                  )}
                </div>

                <div className="modal-footer">
                  {user?.role !== 'ADMIN' && (
                    <button
                      type="button"
                      className={`bookmark-btn ${selectedOpening.isTracked ? 'bookmark-btn--active' : ''}`}
                      disabled={pillInfo.isClosed || trackingLoadingId === selectedOpening.id}
                      onClick={(e) => handleToggleTrack(selectedOpening, e)}
                      aria-label={selectedOpening.isTracked ? "Remove from saved" : "Save opening"}
                      title={selectedOpening.isTracked ? "Remove from saved" : "Save opening"}
                      aria-pressed={!!selectedOpening.isTracked}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill={selectedOpening.isTracked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                      </svg>
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setSelectedOpening(null)}
                  >
                    Close
                  </button>

                  {selectedOpening.applicationLink && (
                    <a
                      href={selectedOpening.applicationLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary"
                    >
                      Apply on portal ↗
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

