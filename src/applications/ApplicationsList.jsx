import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.get('/api/applications');
      setApplications(response.data);
    } catch (err) {
      setError('Failed to fetch applications.');
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
      setDeleteTarget(null);
    } catch (err) {
      console.error('Failed to delete application:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="applications-container">
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
        <div className="applications-loading">Loading applications...</div>
      ) : applications.length === 0 ? (
        <div className="applications-empty">
          <h2 className="empty-title">No applications yet</h2>
          <p className="empty-subtitle">Start tracking your job search in one place.</p>
          <button onClick={() => navigate('/applications/new')} className="btn-primary">
            + Add application
          </button>
        </div>
      ) : (
        <div className="applications-table-wrapper">
          <table className="applications-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Role</th>
                <th>Status</th>
                <th>Applied Date</th>
                <th>Follow-up</th>
                <th>Tags</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id} onClick={() => navigate(`/applications/${app.id}`)} className="table-row-clickable">
                  <td className="font-medium">{app.companyName}</td>
                  <td>{app.jobRole}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <StatusControl
                      value={app.status}
                      onChange={(newStatus) => handleStatusChange(app.id, newStatus)}
                    />
                  </td>
                  <td>{app.appliedDate || '—'}</td>
                  <td>{app.followUpDate || '—'}</td>
                  <td>
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
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(app)}
                      className="action-btn action-btn--delete"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
