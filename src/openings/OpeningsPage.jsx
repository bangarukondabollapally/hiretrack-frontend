import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import './OpeningsPage.css';

export default function OpeningsPage() {
  const navigate = useNavigate();
  const [openings, setOpenings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [includeClosed, setIncludeClosed] = useState(false);
  const [selectedOpening, setSelectedOpening] = useState(null);

  useEffect(() => {
    fetchOpenings();
  }, [includeClosed]);

  const fetchOpenings = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await axiosInstance.get('/api/openings', {
        params: { includeClosed }
      });
      setOpenings(response.data);
    } catch (err) {
      setError('Failed to load placement openings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredOpenings = openings.filter(op => {
    const q = searchQuery.toLowerCase();
    return (
      op.companyName?.toLowerCase().includes(q) ||
      op.jobRole?.toLowerCase().includes(q) ||
      op.location?.toLowerCase().includes(q) ||
      op.jobType?.toLowerCase().includes(q)
    );
  });

  const handleTrackInHireTrack = (opening) => {
    navigate('/applications/new', {
      state: {
        opening: {
          id: opening.id,
          companyName: opening.companyName,
          jobRole: opening.jobRole,
          jobType: opening.jobType || 'Full-time',
          applicationLink: opening.applicationLink,
          description: opening.description || opening.eligibility || ''
        }
      }
    });
  };

  return (
    <div className="openings-page">
      <div className="openings-header">
        <div>
          <h1 className="openings-title">Placement Openings</h1>
          <p className="openings-subtitle">Discover active campus placement opportunities posted by administrators.</p>
        </div>
      </div>

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
          <span>Show closed / expired openings</span>
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
      {error && (
        <div className="openings-error" role="alert">
          {error}
          <button type="button" onClick={fetchOpenings} className="btn-retry">Retry</button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredOpenings.length === 0 && (
        <div className="openings-empty">
          <div className="empty-icon">💼</div>
          <h3>No placement openings found</h3>
          <p>{searchQuery ? 'Try clearing your search filters.' : 'There are currently no active placement openings available.'}</p>
        </div>
      )}

      {/* Openings Grid */}
      {!isLoading && !error && filteredOpenings.length > 0 && (
        <div className="openings-grid">
          {filteredOpenings.map(op => {
            const isClosed = op.status === 'CLOSED';
            const isExpired = op.deadline && new Date(op.deadline) < new Date();

            return (
              <div key={op.id} className={`opening-card ${isClosed ? 'opening-card--closed' : ''}`}>
                <div className="opening-card__header">
                  <div>
                    <h3 className="opening-card__company">{op.companyName}</h3>
                    <div className="opening-card__role">{op.jobRole}</div>
                  </div>
                  <span className={`status-badge ${isClosed ? 'status-badge--closed' : 'status-badge--open'}`}>
                    {isClosed ? 'CLOSED' : 'OPEN'}
                  </span>
                </div>

                <div className="opening-card__meta">
                  {op.jobType && <span className="meta-tag">{op.jobType}</span>}
                  {op.workMode && <span className="meta-tag">{op.workMode}</span>}
                  {op.location && <span className="meta-tag">📍 {op.location}</span>}
                  {op.packageDetails && <span className="meta-tag meta-tag--package">💰 {op.packageDetails}</span>}
                </div>

                {op.eligibility && (
                  <p className="opening-card__eligibility">
                    <strong>Eligibility:</strong> {op.eligibility}
                  </p>
                )}

                {op.deadline && (
                  <div className={`opening-card__deadline ${isExpired ? 'deadline--expired' : ''}`}>
                    Deadline: {op.deadline} {isExpired && '(Expired)'}
                  </div>
                )}

                <div className="opening-card__actions">
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => setSelectedOpening(op)}
                  >
                    View Details
                  </button>

                  <a
                    href={op.applicationLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary btn-sm"
                  >
                    Apply on Portal ↗
                  </a>

                  <button
                    type="button"
                    className="btn-primary btn-sm"
                    onClick={() => handleTrackInHireTrack(op)}
                  >
                    Track in HireTrack
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Opening Details Modal */}
      {selectedOpening && (
        <div className="modal-backdrop" onClick={() => setSelectedOpening(null)}>
          <div className="modal-card modal-card--lg" onClick={(e) => e.stopPropagation()}>
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
                <div><strong>Package/Stipend:</strong> {selectedOpening.packageDetails || 'N/A'}</div>
                <div><strong>Deadline:</strong> {selectedOpening.deadline || 'Rolling'}</div>
                <div>
                  <strong>Status: </strong>
                  <span className={`status-badge ${selectedOpening.status === 'CLOSED' ? 'status-badge--closed' : 'status-badge--open'}`}>
                    {selectedOpening.status}
                  </span>
                </div>
              </div>

              {selectedOpening.eligibility && (
                <div className="opening-detail-section">
                  <h4>Eligibility Criteria</h4>
                  <p>{selectedOpening.eligibility}</p>
                </div>
              )}

              {selectedOpening.description && (
                <div className="opening-detail-section">
                  <h4>Job Description / Details</h4>
                  <div className="opening-description-text">{selectedOpening.description}</div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSelectedOpening(null)}
              >
                Close
              </button>

              <a
                href={selectedOpening.applicationLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                Apply on External Portal ↗
              </a>

              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  const op = selectedOpening;
                  setSelectedOpening(null);
                  handleTrackInHireTrack(op);
                }}
              >
                Track in HireTrack
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
