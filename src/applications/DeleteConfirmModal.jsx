import React from 'react';
import './DeleteConfirmModal.css';

export default function DeleteConfirmModal({ isOpen, title, message, onConfirm, onCancel, isLoading }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" role="dialog" aria-modal="true">
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
      </div>
    </div>
  );
}
