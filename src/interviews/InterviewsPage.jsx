import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import './InterviewsPage.css';

const OUTCOMES = ['PENDING', 'PASSED', 'FAILED', 'CANCELLED'];

export default function InterviewsPage() {
  const navigate = useNavigate();

  // Core Data
  const [interviews, setInterviews] = useState([]);
  const [applications, setApplications] = useState([]);

  // Filters
  const [selectedOutcome, setSelectedOutcome] = useState('');
  const [selectedAppIdFilter, setSelectedAppIdFilter] = useState('');

  // UI States
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPastExpanded, setIsPastExpanded] = useState(true);

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInterview, setEditingInterview] = useState(null); // null = create, object = edit
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  const [modalFormData, setModalFormData] = useState({
    applicationId: '',
    round: '',
    interviewDate: '',
    interviewType: 'Video',
    outcome: 'PENDING',
    notes: '',
  });

  useEffect(() => {
    fetchApplications();
    fetchInterviews();
  }, [selectedOutcome, selectedAppIdFilter]);

  const fetchApplications = async () => {
    try {
      const response = await axiosInstance.get('/api/applications');
      setApplications(response.data || []);
    } catch (err) {
      console.error('Failed to load applications:', err);
    }
  };

  const fetchInterviews = async () => {
    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.append('scope', 'all');
      if (selectedOutcome) params.append('outcome', selectedOutcome);
      if (selectedAppIdFilter) params.append('applicationId', selectedAppIdFilter);

      const response = await axiosInstance.get(`/api/interviews?${params.toString()}`);
      setInterviews(response.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load interviews.');
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingInterview(null);
    setModalError('');
    setModalFormData({
      applicationId: applications.length > 0 ? String(applications[0].id) : '',
      round: '',
      interviewDate: new Date().toISOString().slice(0, 16),
      interviewType: 'Video',
      outcome: 'PENDING',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (interview) => {
    setEditingInterview(interview);
    setModalError('');
    let formattedDate = '';
    if (interview.interviewDate) {
      formattedDate = new Date(interview.interviewDate).toISOString().slice(0, 16);
    }
    setModalFormData({
      applicationId: String(interview.applicationId),
      round: interview.round || '',
      interviewDate: formattedDate,
      interviewType: interview.interviewType || 'Video',
      outcome: interview.outcome || 'PENDING',
      notes: interview.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!modalFormData.applicationId) {
      setModalError('Please select a target application.');
      return;
    }
    if (!modalFormData.round.trim()) {
      setModalError('Please enter a round name.');
      return;
    }
    if (!modalFormData.interviewDate) {
      setModalError('Please enter an interview date.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        round: modalFormData.round,
        interviewDate: modalFormData.interviewDate,
        interviewType: modalFormData.interviewType,
        outcome: modalFormData.outcome,
        notes: modalFormData.notes,
      };

      if (editingInterview) {
        await axiosInstance.put(
          `/api/applications/${editingInterview.applicationId}/interviews/${editingInterview.id}`,
          payload
        );
      } else {
        await axiosInstance.post(
          `/api/applications/${modalFormData.applicationId}/interviews`,
          payload
        );
      }

      setIsModalOpen(false);
      fetchInterviews();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to save interview.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (interview) => {
    if (!window.confirm(`Delete "${interview.round}" for ${interview.companyName}?`)) {
      return;
    }
    try {
      await axiosInstance.delete(`/api/applications/${interview.applicationId}/interviews/${interview.id}`);
      fetchInterviews();
    } catch (err) {
      alert('Failed to delete interview.');
    }
  };

  // Group into Upcoming and Past
  const now = new Date();
  const upcomingInterviews = interviews
    .filter(i => new Date(i.interviewDate) >= now)
    .sort((a, b) => new Date(a.interviewDate) - new Date(b.interviewDate));

  const pastInterviews = interviews
    .filter(i => new Date(i.interviewDate) < now)
    .sort((a, b) => new Date(b.interviewDate) - new Date(a.interviewDate));

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="interviews-container">
      {/* Header */}
      <div className="interviews-header">
        <div>
          <h1 className="page-title">Interviews</h1>
          <p className="interviews-subtitle">
            Manage your upcoming and past interview schedules across all applications.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="btn-primary"
          disabled={applications.length === 0}
        >
          + Add interview
        </button>
      </div>

      {error && <div className="interviews-error">{error}</div>}

      {/* Filter Toolbar */}
      <div className="interviews-toolbar">
        <div className="filter-group">
          <label htmlFor="outcome-filter" className="filter-label">Outcome:</label>
          <select
            id="outcome-filter"
            className="filter-select"
            value={selectedOutcome}
            onChange={(e) => setSelectedOutcome(e.target.value)}
          >
            <option value="">All outcomes</option>
            {OUTCOMES.map(o => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="app-filter" className="filter-label">Application:</label>
          <select
            id="app-filter"
            className="filter-select"
            value={selectedAppIdFilter}
            onChange={(e) => setSelectedAppIdFilter(e.target.value)}
          >
            <option value="">All applications</option>
            {applications.map(app => (
              <option key={app.id} value={app.id}>
                {app.companyName} — {app.jobRole}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading & Empty States */}
      {isLoading ? (
        <div className="interviews-loading-skeleton">
          <div className="skeleton-row" />
          <div className="skeleton-row" />
          <div className="skeleton-row" />
        </div>
      ) : interviews.length === 0 ? (
        <div className="interviews-empty">
          <h2 className="empty-title">No interviews found</h2>
          <p className="empty-subtitle">
            {applications.length === 0
              ? 'Add a job application first to schedule interviews.'
              : 'No interviews scheduled matching the selected filters.'}
          </p>
          {applications.length > 0 ? (
            <button onClick={openCreateModal} className="btn-primary">
              + Schedule an interview
            </button>
          ) : (
            <button onClick={() => navigate('/applications/new')} className="btn-primary">
              + Add Application
            </button>
          )}
        </div>
      ) : (
        <div className="interviews-groups-container">
          {/* Group 1: Upcoming Interviews */}
          <section className="interview-group-section">
            <h2 className="group-title">
              Upcoming ({upcomingInterviews.length})
            </h2>

            {upcomingInterviews.length === 0 ? (
              <p className="empty-group-text">No upcoming interviews scheduled.</p>
            ) : (
              renderInterviewList(upcomingInterviews)
            )}
          </section>

          {/* Group 2: Past Interviews (Collapsible) */}
          {pastInterviews.length > 0 && (
            <section className="interview-group-section">
              <button
                type="button"
                className="group-title-toggle"
                onClick={() => setIsPastExpanded(!isPastExpanded)}
              >
                <span>{isPastExpanded ? '▼' : '►'} Past ({pastInterviews.length})</span>
              </button>

              {isPastExpanded && renderInterviewList(pastInterviews)}
            </section>
          )}
        </div>
      )}

      {/* Add / Edit Interview Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingInterview ? 'Edit Interview Round' : 'Add Interview Round'}
              </h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsModalOpen(false)}
              >
                ×
              </button>
            </div>

            {modalError && <div className="modal-error-alert">{modalError}</div>}

            <form onSubmit={handleModalSubmit} className="modal-form">
              {!editingInterview && (
                <div className="form-group">
                  <label htmlFor="modal-app-select">Application *</label>
                  <select
                    id="modal-app-select"
                    required
                    className="form-input"
                    value={modalFormData.applicationId}
                    onChange={(e) => setModalFormData({ ...modalFormData, applicationId: e.target.value })}
                  >
                    {applications.map(app => (
                      <option key={app.id} value={app.id}>
                        {app.companyName} — {app.jobRole}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="modal-round">Round Name *</label>
                <input
                  id="modal-round"
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. Technical Screen, System Design"
                  value={modalFormData.round}
                  onChange={(e) => setModalFormData({ ...modalFormData, round: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="modal-date">Date & Time *</label>
                  <input
                    id="modal-date"
                    type="datetime-local"
                    required
                    className="form-input"
                    value={modalFormData.interviewDate}
                    onChange={(e) => setModalFormData({ ...modalFormData, interviewDate: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="modal-type">Type</label>
                  <input
                    id="modal-type"
                    type="text"
                    className="form-input"
                    placeholder="Video, Phone, Onsite"
                    value={modalFormData.interviewType}
                    onChange={(e) => setModalFormData({ ...modalFormData, interviewType: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="modal-outcome">Outcome</label>
                <select
                  id="modal-outcome"
                  className="form-input"
                  value={modalFormData.outcome}
                  onChange={(e) => setModalFormData({ ...modalFormData, outcome: e.target.value })}
                >
                  {OUTCOMES.map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="modal-notes">Notes</label>
                <textarea
                  id="modal-notes"
                  rows="3"
                  className="form-input form-textarea"
                  placeholder="Preparation notes or interview feedback..."
                  value={modalFormData.notes}
                  onChange={(e) => setModalFormData({ ...modalFormData, notes: e.target.value })}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : editingInterview ? 'Update Interview' : 'Create Interview'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  // Helper render method for Table & Mobile Cards
  function renderInterviewList(items) {
    return (
      <>
        {/* Desktop/Tablet Table */}
        <div className="interviews-table-wrapper">
          <table className="interviews-table">
            <thead>
              <tr>
                <th style={{ width: '22%' }}>Date & Time</th>
                <th style={{ width: '26%' }}>Company — Role</th>
                <th style={{ width: '18%' }}>Round</th>
                <th style={{ width: '12%' }}>Type</th>
                <th style={{ width: '12%' }}>Outcome</th>
                <th style={{ width: '10%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="interview-table-row">
                  <td className="cell-truncate">{formatDateTime(item.interviewDate)}</td>
                  <td className="cell-truncate font-medium">
                    <Link
                      to={`/applications/${item.applicationId}`}
                      className="app-link"
                      title={`${item.companyName} — ${item.jobRole}`}
                    >
                      {item.companyName || 'Application'} — {item.jobRole || 'Role'}
                    </Link>
                  </td>
                  <td className="cell-truncate" title={item.round}>{item.round}</td>
                  <td className="cell-truncate">{item.interviewType || 'N/A'}</td>
                  <td>
                    <span className={`outcome-badge outcome-badge--${item.outcome?.toLowerCase()}`}>
                      {item.outcome}
                    </span>
                  </td>
                  <td className="table-actions">
                    <button
                      type="button"
                      className="action-btn action-btn--edit"
                      onClick={() => openEditModal(item)}
                      title="Edit interview"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="action-btn action-btn--delete"
                      onClick={() => handleDelete(item)}
                      title="Delete interview"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards (<768px) */}
        <div className="mobile-interview-cards">
          {items.map(item => (
            <div key={item.id} className="interview-card">
              <div className="interview-card__header">
                <Link
                  to={`/applications/${item.applicationId}`}
                  className="interview-card__app-link"
                >
                  {item.companyName} — {item.jobRole}
                </Link>
                <span className={`outcome-badge outcome-badge--${item.outcome?.toLowerCase()}`}>
                  {item.outcome}
                </span>
              </div>

              <div className="interview-card__round">{item.round}</div>

              <div className="interview-card__meta">
                <span>🗓 {formatDateTime(item.interviewDate)}</span>
                {item.interviewType && <span>• {item.interviewType}</span>}
              </div>

              {item.notes && <p className="interview-card__notes">{item.notes}</p>}

              <div className="interview-card__actions">
                <button
                  type="button"
                  className="action-btn action-btn--edit"
                  onClick={() => openEditModal(item)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="action-btn action-btn--delete"
                  onClick={() => handleDelete(item)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }
}
