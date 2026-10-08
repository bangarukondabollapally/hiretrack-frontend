import { useState, useEffect, useRef } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AnimatePresence, m } from 'framer-motion';
import { useAuth } from '../auth/AuthContext';
import { useOpeningsQuery, trackOpeningApi, untrackOpeningApi, invalidateOpeningQueries } from '../api/queries';
import QueryStateNotice from '../components/QueryStateNotice';
import { getOpeningStatus } from './openingStatusHelper';
import StudentOpeningCard, { StudentOpeningCardSkeleton, formatDisplayPackage } from './StudentOpeningCard';
import { DEGREE_TYPES } from '../lib/constants';
import { modalBackdropVariants, modalCardVariants } from '../lib/motion';
import './OpeningsPage.css';


export default function OpeningsPage() {
  const { user } = useAuth();
  const userId = user?.userId || user?.id || user?.email;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDegreeFilter, setSelectedDegreeFilter] = useState('');
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

    if (selectedDegreeFilter) {
      const degreesRaw = op.degreeTypes || op.degree || '';
      const opDegrees = degreesRaw ? degreesRaw.split(',').map(d => d.trim()).filter(Boolean) : [];
      if (opDegrees.length > 0 && !opDegrees.includes(selectedDegreeFilter)) {
        return false;
      }
    }

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

        <select
          className="field-input field-select"
          value={selectedDegreeFilter}
          onChange={(e) => setSelectedDegreeFilter(e.target.value)}
          aria-label="Filter by degree type"
          style={{ width: 'auto', minWidth: '150px' }}
        >
          <option value="">All Degrees</option>
          {DEGREE_TYPES.map(deg => (
            <option key={deg} value={deg}>{deg}</option>
          ))}
        </select>

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
        <div className="openings-grid">
          {[1, 2, 3, 4, 5, 6].map((key) => (
            <StudentOpeningCardSkeleton key={key} />
          ))}
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
                    <div><strong>Year of Study:</strong> {selectedOpening.yearOfStudy || 'All Years'}</div>
                    <div><strong>Deadline:</strong> {selectedOpening.deadline || 'Rolling'}</div>
                    <div>
                      <strong>Status: </strong>
                      <span className={`status-badge ${modalStatus.isClosedOrExpired ? 'status-badge--closed' : 'status-badge--open'}`}>
                        {modalStatus.label.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="opening-detail-section">
                    <h4>Eligibility criteria</h4>
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
