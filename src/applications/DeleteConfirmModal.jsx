import { useEffect, useRef } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import { useScrollLock } from '../hooks/useScrollLock';
import { modalBackdropVariants, modalCardVariants } from '../lib/motion';
import './DeleteConfirmModal.css';

export default function DeleteConfirmModal({ isOpen, title, message, onConfirm, onCancel, isLoading }) {
  useScrollLock(isOpen);
  const lastFocusedRef = useRef(null);


  useEffect(() => {
    if (!isOpen) return;
    lastFocusedRef.current = document.activeElement;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isLoading) {
        onCancel();
      }
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
