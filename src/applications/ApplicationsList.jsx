import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useApplicationsQuery, invalidateApplicationQueries, queryClient } from '../api/queries';
import axiosInstance from '../api/axiosInstance';
import { AnimatePresence, m } from 'framer-motion';
import { toastVariants, listItemVariants } from '../lib/motion';
import StatusControl from './StatusControl';
import DeleteConfirmModal from './DeleteConfirmModal';
import QueryStateNotice from '../components/QueryStateNotice';
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
  } catch (_e) {
    return dateStr;
  }
}

function getFlightLegDates(appliedDate, followUpDate) {
  const appliedFormatted = formatDate(appliedDate);
  const followUpFormatted = formatDate(followUpDate);
  if (appliedFormatted && followUpFormatted) {
    return `Applied ${appliedFormatted} → ${followUpFormatted}`;
  }
  if (appliedFormatted) return `Applied ${appliedFormatted}`;
  if (followUpFormatted) return `Follow-up ${followUpFormatted}`;
  return '';
}

export default function ApplicationsList() {
  const { user } = useAuth();
  const userId = user?.userId || user?.id || user?.email;

  const {
    data: applicationsData,
    isLoading: isQueryLoading,
    isFetching,
    isError,
    error: queryErr,
    refetch,
  } = useApplicationsQuery(userId);

  const applications = applicationsData || [];
  const isLoading = isQueryLoading && !applicationsData;

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
  }, [location.state]);

  const isFromCache = !isQueryLoading && !!applicationsData;
  const [highlightedId, setHighlightedId] = useState(null);

  const handleStatusChange = async (id, newStatus) => {
    setHighlightedId(id);
    setTimeout(() => setHighlightedId(null), 1000);

    const queryKey = ['applications', userId];
    const previousApps = queryClient.getQueryData(queryKey);

    // Optimistic Update
    queryClient.setQueryData(queryKey, (old) =>
      (old || []).map((app) => (app.id === id ? { ...app, status: newStatus } : app))
    );

    try {
      const targetApp = (previousApps || []).find((a) => a.id === id) || {};
      const updatedData = { ...targetApp, status: newStatus };
      await axiosInstance.put(`/api/applications/${id}`, updatedData);
      invalidateApplicationQueries(userId);
    } catch (err) {
      console.error('Failed to update status:', err);
      // Rollback on error
      if (previousApps) {
        queryClient.setQueryData(queryKey, previousApps);
      }
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await axiosInstance.delete(`/api/applications/${deleteTarget.id}`);
      invalidateApplicationQueries(userId);
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
      <QueryStateNotice
        isFetching={isFetching && !isLoading}
        isError={isError && applications.length > 0}
        error={queryErr}
        refetch={refetch}
      />
      <AnimatePresence>
        {toastMessage && (
          <m.div
            key="toast"
            className="applications-toast"
            role="status"
            variants={toastVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            ✓ {toastMessage}
          </m.div>
        )}
      </AnimatePresence>

      <div className="applications-header">
        <div>
          <h1 className="page-title">Applications</h1>
          <p className="applications-subtitle">Every application and its status in one list.</p>
        </div>
        {applications.length > 0 && (
          <button onClick={() => navigate('/applications/new')} className="btn-primary">
            <span className="btn-text-desktop">+ Add application</span>
            <span className="btn-text-mobile">+</span>
          </button>
        )}
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
              <span className="btn-text-desktop">+ Add application</span>
              <span className="btn-text-mobile">+ Add application</span>
            </button>
          )}
        </div>
      ) : (
        <div className="ticket-list">
          <AnimatePresence>
            {filteredApps.map((app) => {
              const dateLeg = getFlightLegDates(app.appliedDate, app.followUpDate);
              const hasTags = app.tags && app.tags.length > 0;
              const isHighlighted = app.id === highlightedId;

              return (
                <m.div
                  key={app.id}
                  layout
                  variants={listItemVariants}
                  initial={isFromCache ? false : "hidden"}
                  animate="visible"
                  exit="exit"
                  whileTap={{ scale: 0.98 }}
                  className={`ticket-row ${isHighlighted ? 'ticket-row--highlighted' : ''}`}
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

                  {app.notes && (
                    <div className="ticket-notes">
                      <span className="ticket-notes-icon" aria-hidden="true">📝</span>
                      <span className="ticket-notes-text">{app.notes}</span>
                    </div>
                  )}

                  {(hasTags || app.placementOpeningId) && (
                    <div className="ticket-tags">
                      {app.placementOpeningId && (
                        <span className="ticket-tag" style={{ background: '#EEF6F3', color: '#2A5C4B', borderColor: '#2A5C4B' }}>
                          Placement opening
                        </span>
                      )}
                      {hasTags && app.tags.map((t, idx) => (
                        <span key={idx} className="ticket-tag">{t}</span>
                      ))}
                    </div>
                  )}
                </m.div>
              );
            })}
          </AnimatePresence>
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
