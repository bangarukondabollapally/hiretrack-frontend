import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import StatusControl from './StatusControl';
import DeleteConfirmModal from './DeleteConfirmModal';
import './ApplicationsList.css';

export default function ApplicationsList() {
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Read toast message from create redirect if present (item 3.3)
    if (location.state?.toastMessage) {
      setToastMessage(location.state.toastMessage);
      // Clear location state
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

  return (
    <div className="applications-container">
      {/* Brief success toast notification */}
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

      {error && <div className="applications-error">{error}</div>}

      {isLoading ? (
        <div className="applications-loading-skeleton">
          <div className="skeleton-row" />
          <div className="skeleton-row" />
          <div className="skeleton-row" />
        </div>
      ) : applications.length === 0 ? (
        <div className="applications-empty">
          <h2 className="empty-title">No applications yet</h2>
          <p className="empty-subtitle">Start tracking your job search in one place.</p>
          <button onClick={() => navigate('/applications/new')} className="btn-primary">
            + Add application
          </button>
        </div>
      ) : (
        <>
          {/* Desktop & Tablet Table (>=768px) */}
          <div className="applications-table-wrapper">
            <table className="applications-table">
              <thead>
                <tr>
                  <th style={{ width: '22%' }}>Company</th>
                  <th style={{ width: '24%' }}>Role</th>
                  <th style={{ width: '18%' }}>Status</th>
                  <th className="col-applied" style={{ width: '12%' }}>Applied</th>
                  <th style={{ width: '12%' }}>Follow-up</th>
                  <th className="col-tags" style={{ width: '12%' }}>Tags</th>
                  <th style={{ width: '10%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app.id} onClick={() => navigate(`/applications/${app.id}`)} className="table-row-clickable">
                    <td className="font-medium cell-truncate" title={app.companyName}>{app.companyName}</td>
                    <td className="cell-truncate" title={app.jobRole}>{app.jobRole}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <StatusControl
                        value={app.status}
                        onChange={(newStatus) => handleStatusChange(app.id, newStatus)}
                      />
                    </td>
                    <td className="col-applied cell-truncate">{app.appliedDate || '—'}</td>
                    <td className="cell-truncate">{app.followUpDate || '—'}</td>
                    <td className="col-tags">
                      <div className="table-tags">
                        {app.tags && app.tags.map((t, idx) => (
                          <span key={idx} className="table-tag">{t}</span>
                        ))}
                      </div>
                    </td>
                    <td onClick={(e) => e.stopPropagation()} className="table-actions">
                      <button
                        onClick={() => navigate(`/applications/${app.id}`)}
                        className="action-btn action-btn--edit"
                        title="Edit application"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget(app)}
                        className="action-btn action-btn--delete"
                        title="Delete application"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Cards (<768px per item 3.5 & DESIGN §8) */}
          <div className="mobile-app-cards">
            {applications.map((app) => (
              <div
                key={app.id}
                className="app-card"
                onClick={() => navigate(`/applications/${app.id}`)}
              >
                <div className="app-card__header">
                  <div className="app-card__title-group">
                    <h3 className="app-card__company" title={app.companyName}>{app.companyName}</h3>
                    <p className="app-card__role" title={app.jobRole}>{app.jobRole}</p>
                  </div>
                  <div onClick={(e) => e.stopPropagation()} className="app-card__status-wrapper">
                    <StatusControl
                      value={app.status}
                      onChange={(newStatus) => handleStatusChange(app.id, newStatus)}
                    />
                  </div>
                </div>

                <div className="app-card__dates">
                  {app.appliedDate && <span>Applied: {app.appliedDate}</span>}
                  {app.followUpDate && <span>Follow-up: {app.followUpDate}</span>}
                </div>

                {app.tags && app.tags.length > 0 && (
                  <div className="app-card__tags">
                    {app.tags.map((t, idx) => (
                      <span key={idx} className="table-tag">{t}</span>
                    ))}
                  </div>
                )}

                <div className="app-card__footer" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => navigate(`/applications/${app.id}`)}
                    className="action-btn action-btn--edit"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteTarget(app)}
                    className="action-btn action-btn--delete"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
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
