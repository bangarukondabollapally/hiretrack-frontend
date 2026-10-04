import { useEffect } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import { modalBackdropVariants, modalCardVariants } from '../lib/motion';
import './DeleteConfirmModal.css';

export default function DeleteConfirmModal({ isOpen, title, message, onConfirm, onCancel, isLoading }) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isLoading) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onCancel]);

  return (
    <AnimatePresence>
      {isOpen && (
        <m.div
          className="modal-overlay"
          variants={modalBackdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={onCancel}
        >
          <m.div
            className="modal-content"
            role="dialog"
            aria-modal="true"
            variants={modalCardVariants}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="modal-title">{title || 'Confirm Deletion'}</h3>
            <p className="modal-message">
              {message || 'Are you sure you want to delete this item? This action cannot be undone.'}
            </p>
            <div className="modal-actions">
              <button onClick={onCancel} className="modal-btn modal-btn--secondary" disabled={isLoading}>
                Cancel
              </button>
              <button onClick={onConfirm} className="modal-btn modal-btn--danger" disabled={isLoading}>
                {isLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
