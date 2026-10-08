import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AnimatePresence, m } from 'framer-motion';
import { useAuth } from '../auth/AuthContext';
import { useApplicationsQuery, useInterviewsQuery, invalidateInterviewQueries } from '../api/queries';
import axiosInstance from '../api/axiosInstance';
import QueryStateNotice from '../components/QueryStateNotice';
import DeleteConfirmModal from '../applications/DeleteConfirmModal';
import DatePickerPopover from '../components/DatePickerPopover';
import { modalBackdropVariants, modalCardVariants, listItemVariants } from '../lib/motion';
import { useScrollLock } from '../hooks/useScrollLock';
import './InterviewsPage.css';

const OUTCOMES = ['PENDING', 'PASSED', 'FAILED', 'CANCELLED'];

export default function InterviewsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.userId || user?.id || user?.email;

  // Filters
  const [selectedOutcome, setSelectedOutcome] = useState('');
  const [selectedAppIdFilter, setSelectedAppIdFilter] = useState('');
  const [isPastExpanded, setIsPastExpanded] = useState(true);
  const [expandedNotes, setExpandedNotes] = useState({});

  // Queries
  const { data: applicationsData } = useApplicationsQuery(userId);
  const applications = applicationsData || [];

  const filters = {
    scope: 'all',
    ...(selectedOutcome ? { outcome: selectedOutcome } : {}),
    ...(selectedAppIdFilter ? { applicationId: selectedAppIdFilter } : {}),
  };

  const {
    data: interviewsData,
    isLoading: isIntLoading,
    isFetching: isIntFetching,
    isError: isIntError,
    error: intErr,
    refetch: refetchInterviews,
  } = useInterviewsQuery(userId, filters);

  const interviews = interviewsData || [];
  const isLoading = isIntLoading && !interviewsData;

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  useScrollLock(isModalOpen);

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

  const lastFocusedRef = useRef(null);

  useEffect(() => {
    if (!isModalOpen) return;
    lastFocusedRef.current = document.activeElement;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (
        lastFocusedRef.current &&
        document.body.contains(lastFocusedRef.current) &&
        typeof lastFocusedRef.current.focus === 'function'
      ) {
        lastFocusedRef.current.focus();
      }
    };
  }, [isModalOpen]);

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

      const targetAppId = editingInterview ? editingInterview.applicationId : modalFormData.applicationId;

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

      invalidateInterviewQueries(userId, targetAppId);
      setIsModalOpen(false);
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to save interview.');
    } finally {
      setIsSaving(false);
    }
  };

  const [deleteTargetInterview, setDeleteTargetInterview] = useState(null);
  const [isDeletingInterview, setIsDeletingInterview] = useState(false);

  const handleDeleteConfirm = async () => {
    if (!deleteTargetInterview) return;
    setIsDeletingInterview(true);
    try {
      await axiosInstance.delete(`/api/applications/${deleteTargetInterview.applicationId}/interviews/${deleteTargetInterview.id}`);
      invalidateInterviewQueries(userId, deleteTargetInterview.applicationId);
      setDeleteTargetInterview(null);
    } catch (err) {
      console.error('Failed to delete interview:', err);
    } finally {
      setIsDeletingInterview(false);
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
      <QueryStateNotice
        isFetching={isIntFetching && !isLoading}
        isError={isIntError && interviews.length > 0}
        error={intErr}
        refetch={refetchInterviews}
      />
      {/* Header */}
      <div className="interviews-header">
        <div>
          <h1 className="page-title">Interviews</h1>
          <p className="interviews-subtitle">
            All your interview rounds, upcoming and past, in one place.
          </p>
        </div>
        {applications.length > 0 && (
          <button onClick={openCreateModal} className="btn-primary">
            <span className="btn-text-desktop">+ Add interview</span>
            <span className="btn-text-mobile">+</span>
          </button>
        )}
      </div>

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
              <span className="btn-text-desktop">+ Add interview</span>
              <span className="btn-text-mobile">+ Add interview</span>
            </button>
          ) : (
            <button onClick={() => navigate('/applications/new')} className="btn-primary">
              <span className="btn-text-desktop">+ Add application</span>
              <span className="btn-text-mobile">+ Add application</span>
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
              <div className="empty-group-box">
                <p className="empty-group-text">No upcoming interviews scheduled.</p>
                {applications.length > 0 && (
                  <button onClick={openCreateModal} className="btn-secondary btn-sm">
                    + Add interview
                  </button>
                )}
              </div>
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
      <AnimatePresence>
        {isModalOpen && (
          <m.div
            className="modal-backdrop"
            variants={modalBackdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={() => setIsModalOpen(false)}
          >
            <m.div
              className="modal-card"
              variants={modalCardVariants}
              onClick={(e) => e.stopPropagation()}
            >
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
                    <label>Interview Date *</label>
                    <DatePickerPopover
                      value={modalFormData.interviewDate ? modalFormData.interviewDate.split('T')[0] : ''}
                      onChange={(dateVal) => {
                        const timePart = modalFormData.interviewDate?.includes('T')
                          ? modalFormData.interviewDate.split('T')[1]
                          : '10:00';
                        setModalFormData({ ...modalFormData, interviewDate: `${dateVal}T${timePart}` });
                      }}
                      placeholder="Select interview date"
                      required
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
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
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
                <th style={{ width: '24%' }}>Company — Role</th>
                <th style={{ width: '22%' }}>Round & Notes</th>
                <th style={{ width: '12%' }}>Type</th>
                <th style={{ width: '12%' }}>Outcome</th>
                <th style={{ width: '10%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {items.map(item => {
                  const isPastPending = new Date(item.interviewDate) < now && item.outcome === 'PENDING';
                  const isNotesExpanded = expandedNotes[item.id];

                  return (
                    <m.tr
                      key={item.id}
                      layout
                      variants={listItemVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="interview-table-row"
                    >
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
                      <td>
                        <div className="round-cell">
                          <span className="round-name">{item.round}</span>
                          {item.notes && (
                            <div className="notes-preview-box">
                              <p className={`notes-text ${isNotesExpanded ? 'notes-text--expanded' : 'notes-text--preview'}`}>
                                {item.notes}
                              </p>
                              <button
                                type="button"
                                className="notes-toggle-btn"
                                onClick={() => setExpandedNotes(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                              >
                                {isNotesExpanded ? 'Hide notes' : 'Show notes'}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="cell-truncate">{item.interviewType || 'N/A'}</td>
                      <td>
                        <div className="outcome-cell">
                          <span className={`outcome-badge outcome-badge--${item.outcome?.toLowerCase()}`}>
                            {item.outcome}
                          </span>
                          {isPastPending && (
                            <button
                              type="button"
                              className="btn-add-outcome"
                              onClick={() => openEditModal(item)}
                              title="Set final outcome"
                            >
                              + Add outcome
                            </button>
                          )}
                        </div>
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
                          onClick={() => setDeleteTargetInterview(item)}
                          title="Delete interview"
                        >
                          Delete
                        </button>
                      </td>
                    </m.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Mobile Cards (<768px) */}
        <div className="mobile-interview-cards">
          <AnimatePresence>
            {items.map(item => {
              const isPastPending = new Date(item.interviewDate) < now && item.outcome === 'PENDING';
              const isNotesExpanded = expandedNotes[item.id];

              return (
                <m.div
                  key={item.id}
                  layout
                  variants={listItemVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  whileTap={{ scale: 0.98 }}
                  className="interview-card"
                >
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
                    <span>{formatDateTime(item.interviewDate)}</span>
                    {item.interviewType && <span>• {item.interviewType}</span>}
                  </div>

                  {isPastPending && (
                    <div className="mobile-outcome-prompt">
                      <button
                        type="button"
                        className="btn-add-outcome"
                        onClick={() => openEditModal(item)}
                      >
                        + Add outcome
                      </button>
                    </div>
                  )}

                  {item.notes && (
                    <div className="notes-preview-box">
                      <p className={`notes-text ${isNotesExpanded ? 'notes-text--expanded' : 'notes-text--preview'}`}>
                        {item.notes}
                      </p>
                      <button
                        type="button"
                        className="notes-toggle-btn"
                        onClick={() => setExpandedNotes(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                      >
                        {isNotesExpanded ? 'Hide notes' : 'Show notes'}
                      </button>
                    </div>
                  )}

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
                      onClick={() => setDeleteTargetInterview(item)}
                    >
                      Delete
                    </button>
                  </div>
                </m.div>
              );
            })}
          </AnimatePresence>
        </div>

        <DeleteConfirmModal
          isOpen={Boolean(deleteTargetInterview)}
          title="Delete Interview Round"
          message={`Are you sure you want to delete "${deleteTargetInterview?.round}" for ${deleteTargetInterview?.companyName}?`}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTargetInterview(null)}
          isLoading={isDeletingInterview}
        />
      </>
    );
  }
}
