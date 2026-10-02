import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import StatusControl from './StatusControl';
import DeleteConfirmModal from './DeleteConfirmModal';
import './ApplicationsList.css';

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length < 3) return dateStr;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch (e) {
    return dateStr;
  }
}

function getFlightLegDates(appliedDate, followUpDate) {
  const appliedFormatted = formatDate(appliedDate);
  const followUpFormatted = formatDate(followUpDate);
  if (appliedFormatted && followUpFormatted) {
    return `${appliedFormatted} → ${followUpFormatted}`;
  }
  if (appliedFormatted) return appliedFormatted;
  if (followUpFormatted) return `→ ${followUpFormatted}`;
  return '';
}

export default function ApplicationsList() {
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.toastMessage) {
      setToastMessage(location.state.toastMessage);
      window.history.replaceState({}, document.title);
      setTimeout(() => setToastMessage(''), 4000);
    }

    const cached = sessionStorage.getItem('ht_cache_applications');
    if (cached) {
      try {
        setApplications(JSON.parse(cached));
        setIsLoading(false);
      } catch (e) {
        setIsLoading(true);
      }
    } else {
      setIsLoading(true);
    }
    fetchApplications();
  }, [location.state]);

  const fetchApplications = async () => {
    try {
      const response = await axiosInstance.get('/api/applications');
      setApplications(response.data);
      sessionStorage.setItem('ht_cache_applications', JSON.stringify(response.data));
    } catch (err) {
      if (!applications.length) {
        setError('Failed to fetch applications.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const appRes = await axiosInstance.get(`/api/applications/${id}`);
      const updatedData = { ...appRes.data, status: newStatus };
      await axiosInstance.put(`/api/applications/${id}`, updatedData);

      setApplications(prev =>
        prev.map(app => (app.id === id ? { ...app, status: newStatus } : app))
      );
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await axiosInstance.delete(`/api/applications/${deleteTarget.id}`);
      setApplications(prev => prev.filter(app => app.id !== deleteTarget.id));
      sessionStorage.removeItem('ht_cache_applications');
      setDeleteTarget(null);
    } catch (err) {
      console.error('Failed to delete application:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredApps = applications.filter(app => {
    const matchesSearch = !searchQuery ||
      (app.companyName && app.companyName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (app.jobRole && app.jobRole.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="applications-container">
      {toastMessage && (
        <div className="applications-toast" role="status">
          ✓ {toastMessage}
        </div>
      )}

      <div className="applications-header">
        <div>
          <h1 className="page-title">Applications</h1>
          <p className="applications-subtitle">Track and manage your active job applications</p>
        </div>
        <button onClick={() => navigate('/applications/new')} className="btn-primary">
          + Add application
        </button>
      </div>

      {/* Filter Bar: Search + Minimal Status Filter */}
      <div className="applications-filter-bar">
        <input
          type="text"
          placeholder="Search by company or role..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="applications-search-input"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="applications-status-filter"
        >
          <option value="ALL">All Statuses</option>
          <option value="APPLIED">Applied</option>
          <option value="SCREENING">Screening</option>
          <option value="INTERVIEW">Interview</option>
          <option value="OFFER">Offer</option>
          <option value="REJECTED">Rejected</option>
          <option value="WITHDRAWN">Withdrawn</option>
        </select>
      </div>

      {error && <div className="applications-error">{error}</div>}

      {isLoading ? (
        <div className="applications-loading-skeleton">
          <div className="skeleton-ticket" />
          <div className="skeleton-ticket" />
          <div className="skeleton-ticket" />
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="applications-empty">
          <h2 className="empty-title">
            {applications.length === 0 ? 'No applications yet' : 'No matching applications'}
          </h2>
          <p className="empty-subtitle">
            {applications.length === 0
              ? 'Start tracking your job search in one place.'
              : 'Try clearing your search or status filter.'}
          </p>
          {applications.length === 0 && (
            <button onClick={() => navigate('/applications/new')} className="btn-primary">
              + Add application
            </button>
          )}
        </div>
      ) : (
        <div className="ticket-list">
          {filteredApps.map((app) => {
            const dateLeg = getFlightLegDates(app.appliedDate, app.followUpDate);
            const hasTags = app.tags && app.tags.length > 0;

            return (
              <div
                key={app.id}
                className="ticket-row"
                onClick={() => navigate(`/applications/${app.id}`)}
              >
                <div className="ticket-top-line">
                  <div className="ticket-info">
                    <span className="ticket-company">{app.companyName}</span>
                    <span className="ticket-role">{app.jobRole}</span>
                  </div>

                  {dateLeg && <div className="ticket-dates">{dateLeg}</div>}

                  <div className="ticket-stub-divider" />

                  <div className="ticket-right-group" onClick={(e) => e.stopPropagation()}>
                    <StatusControl
                      value={app.status}
                      onChange={(newStatus) => handleStatusChange(app.id, newStatus)}
                    />
                    <button
                      className="ticket-delete-btn"
                      onClick={() => setDeleteTarget(app)}
                      title="Delete application"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {hasTags && (
                  <div className="ticket-tags">
                    {app.tags.map((t, idx) => (
                      <span key={idx} className="ticket-tag">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Application"
        message={`Are you sure you want to delete your application for "${deleteTarget?.jobRole}" at "${deleteTarget?.companyName}"? All related interview rounds will also be deleted.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        isLoading={isDeleting}
      />
    </div>
  );
}
