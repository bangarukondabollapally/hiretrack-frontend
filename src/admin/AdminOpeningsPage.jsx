import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, m } from 'framer-motion';
import { useAuth } from '../auth/AuthContext';
import { useAdminOpeningsQuery, invalidateOpeningQueries } from '../api/queries';
import axiosInstance from '../api/axiosInstance';
import QueryStateNotice from '../components/QueryStateNotice';
import AdminOpeningCard from './AdminOpeningCard';
import { modalBackdropVariants, modalCardVariants } from '../lib/motion';
import './AdminOpeningsPage.css';

export default function AdminOpeningsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.userId || user?.id || user?.email;

  const {
    data: openingsData,
    isLoading: isOpLoading,
    isFetching,
    isError,
    error: opErr,
    refetch,
  } = useAdminOpeningsQuery(userId);

  const openings = openingsData || [];
  const isLoading = isOpLoading && !openingsData;

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Delete modal state
  const [deletingOpening, setDeletingOpening] = useState(null);


  const [isDeleting, setIsDeleting] = useState(false);

  const deleteLastFocusedRef = useRef(null);

  useEffect(() => {
    if (!deletingOpening) return;
    deleteLastFocusedRef.current = document.activeElement;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isDeleting) setDeletingOpening(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (
        deleteLastFocusedRef.current &&
        document.body.contains(deleteLastFocusedRef.current) &&
        typeof deleteLastFocusedRef.current.focus === 'function'
      ) {
        deleteLastFocusedRef.current.focus();
      }
    };
  }, [deletingOpening, isDeleting]);

  const openCreateForm = () => {
    navigate('/admin/manageopenings');
  };

  const openEditForm = (opening) => {
    navigate(`/admin/manageopenings?edit=${opening.id}`);
  };

  const handleCloseOpening = async (opening) => {
    try {
      await axiosInstance.put(`/api/admin/openings/${opening.id}/close`);
      setSuccessMsg(`Placement opening for "${opening.companyName}" closed.`);
      invalidateOpeningQueries(userId);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (_err) {
      setError('Failed to close opening.');
    }
  };

  const handleReopenOpening = async (opening) => {
    try {
      await axiosInstance.put(`/api/admin/openings/${opening.id}`, {
        ...opening,
        status: 'OPEN'
      });
      setSuccessMsg(`Placement opening for "${opening.companyName}" reopened.`);
      invalidateOpeningQueries(userId);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (_err) {
      setError('Failed to reopen opening.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingOpening) return;
    setIsDeleting(true);
    try {
      await axiosInstance.delete(`/api/admin/openings/${deletingOpening.id}`);
      setSuccessMsg(`Placement opening for "${deletingOpening.companyName}" deleted.`);
      setDeletingOpening(null);
      invalidateOpeningQueries(userId);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (_err) {
      setError('Failed to delete opening.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="admin-openings-page">
      <QueryStateNotice
        isFetching={isFetching && !isLoading}
        isError={isError && openings.length > 0}
        error={opErr}
        refetch={refetch}
      />
      <div className="admin-header">
        <div>
          <h1 className="admin-title">Placement Opening Management</h1>
          <p className="admin-subtitle">Create, edit, close, and publish campus placement listings.</p>
        </div>
        <button type="button" className="btn-primary" onClick={openCreateForm}>
          + Publish Opening
        </button>
      </div>

      {successMsg && <div className="admin-alert admin-alert--success">{successMsg}</div>}
      {error && <div className="admin-alert admin-alert--error">{error}</div>}

      {/* Loading State */}
      {isLoading && (
        <div className="admin-loading">
          <span className="spinner" />
          <span>Loading placement openings...</span>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && openings.length === 0 && (
        <div className="admin-empty">
          <h3>No openings created yet</h3>
          <p>Click "+ Publish Opening" to create your first placement listing.</p>
        </div>
      )}

      {/* Opening Cards List */}
      {!isLoading && openings.length > 0 && (
        <div className="admin-openings-list">
          <AnimatePresence mode="popLayout">
            {openings.map(op => (
              <AdminOpeningCard
                key={op.id}
                opening={op}
                onEdit={openEditForm}
                onClose={handleCloseOpening}
                onReopen={handleReopenOpening}
                onDelete={setDeletingOpening}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingOpening && (
          <m.div
            className="modal-backdrop"
            variants={modalBackdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={() => setDeletingOpening(null)}
          >
            <m.div
              className="modal-card"
              variants={modalCardVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>Confirm Delete</h2>
                <button type="button" className="modal-close" onClick={() => setDeletingOpening(null)}>✕</button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to permanently delete the placement opening for <strong>{deletingOpening.companyName} — {deletingOpening.jobRole}</strong>?</p>
                <p className="delete-warning">This action cannot be undone.</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setDeletingOpening(null)}>
                  Cancel
                </button>
                <button type="button" className="btn-danger" onClick={handleDeleteConfirm} disabled={isDeleting}>
                  {isDeleting ? 'Deleting...' : 'Delete Permanently'}
                </button>
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
