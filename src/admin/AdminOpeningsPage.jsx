import { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import './AdminOpeningsPage.css';

export default function AdminOpeningsPage() {
  const [openings, setOpenings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOpening, setEditingOpening] = useState(null);
  const [formData, setFormData] = useState({
    companyName: '',
    jobRole: '',
    jobType: 'Full-time',
    location: '',
    workMode: 'Hybrid',
    packageDetails: '',
    eligibility: '',
    deadline: '',
    description: '',
    applicationLink: '',
    status: 'OPEN'
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete modal state
  const [deletingOpening, setDeletingOpening] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchOpenings();
  }, []);

  const fetchOpenings = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await axiosInstance.get('/api/admin/openings');
      setOpenings(response.data);
    } catch (err) {
      if (err.response?.status === 403) {
        setError('Access Denied: You must be logged in as an ADMIN to manage openings.');
      } else {
        setError('Failed to fetch placement openings. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateForm = () => {
    setEditingOpening(null);
    setFormData({
      companyName: '',
      jobRole: '',
      jobType: 'Full-time',
      location: '',
      workMode: 'Hybrid',
      packageDetails: '',
      eligibility: '',
      deadline: '',
      description: '',
      applicationLink: '',
      status: 'OPEN'
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const openEditForm = (opening) => {
    setEditingOpening(opening);
    setFormData({
      companyName: opening.companyName || '',
      jobRole: opening.jobRole || '',
      jobType: opening.jobType || 'Full-time',
      location: opening.location || '',
      workMode: opening.workMode || 'Hybrid',
      packageDetails: opening.packageDetails || '',
      eligibility: opening.eligibility || '',
      deadline: opening.deadline || '',
      description: opening.description || '',
      applicationLink: opening.applicationLink || '',
      status: opening.status || 'OPEN'
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.companyName.trim()) errs.companyName = 'Company name is required';
    if (!formData.jobRole.trim()) errs.jobRole = 'Job role is required';
    if (!formData.applicationLink.trim()) {
      errs.applicationLink = 'Application link is required';
    } else if (!/^https?:\/\/.+/i.test(formData.applicationLink.trim())) {
      errs.applicationLink = 'Application link must start with http:// or https://';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setError('');

    try {
      if (editingOpening) {
        await axiosInstance.put(`/api/admin/openings/${editingOpening.id}`, formData);
        setSuccessMsg(`Placement opening for "${formData.companyName}" updated.`);
      } else {
        await axiosInstance.post('/api/admin/openings', formData);
        setSuccessMsg(`Placement opening for "${formData.companyName}" created.`);
      }

      setIsFormOpen(false);
      fetchOpenings();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      if (err.response?.status === 403) {
        setError('Access Denied: Only ADMIN users can perform this operation.');
      } else {
        setError(err.response?.data?.message || 'Failed to save placement opening.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseOpening = async (opening) => {
    try {
      await axiosInstance.put(`/api/admin/openings/${opening.id}/close`);
      setSuccessMsg(`Placement opening for "${opening.companyName}" closed.`);
      fetchOpenings();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError('Failed to close opening.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingOpening) return;
    setIsDeleting(true);
    try {
      await axiosInstance.delete(`/api/admin/openings/${deletingOpening.id}`);
      setSuccessMsg(`Placement opening for "${deletingOpening.companyName}" deleted.`);
      setDeletingOpening(null);
      fetchOpenings();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError('Failed to delete opening.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="admin-openings-page">
      <div className="admin-header">
        <div>
          <h1 className="admin-title">Placement Opening Management</h1>
          <p className="admin-subtitle">Create, edit, close, and manage campus placement listings.</p>
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
          {openings.map(op => {
            const isClosed = op.status === 'CLOSED';
            return (
              <div key={op.id} className={`admin-opening-card ${isClosed ? 'admin-opening-card--closed' : ''}`}>
                <div className="admin-card__top">
                  <div>
                    <h3 className="admin-card__company">{op.companyName}</h3>
                    <div className="admin-card__role">{op.jobRole}</div>
                  </div>
                  <span className={`status-badge ${isClosed ? 'status-badge--closed' : 'status-badge--open'}`}>
                    {op.status}
                  </span>
                </div>

                <div className="admin-card__meta">
                  {op.jobType && <span className="meta-tag">{op.jobType}</span>}
                  {op.workMode && <span className="meta-tag">{op.workMode}</span>}
                  {op.location && <span className="meta-tag">📍 {op.location}</span>}
                  {op.packageDetails && <span className="meta-tag meta-tag--package">💰 {op.packageDetails}</span>}
                  {op.deadline && <span className="meta-tag">Deadline: {op.deadline}</span>}
                </div>

                {op.eligibility && (
                  <div className="admin-card__eligibility">
                    <strong>Eligibility:</strong> {op.eligibility}
                  </div>
                )}

                <div className="admin-card__actions">
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => openEditForm(op)}
                  >
                    Edit
                  </button>

                  {!isClosed && (
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      onClick={() => handleCloseOpening(op)}
                    >
                      Close Opening
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn-danger btn-sm"
                    onClick={() => setDeletingOpening(op)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Form Modal */}
      {isFormOpen && (
        <div className="modal-backdrop" onClick={() => setIsFormOpen(false)}>
          <div className="modal-card modal-card--lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingOpening ? 'Edit Placement Opening' : 'Publish New Placement Opening'}</h2>
              <button type="button" className="modal-close" onClick={() => setIsFormOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleFormSubmit} noValidate>
              <div className="modal-body">
                <div className="form-row">
                  <div className="field">
                    <label className="field-label">Company Name <span className="required">*</span></label>
                    <input
                      type="text"
                      className={`field-input ${formErrors.companyName ? 'field-input--error' : ''}`}
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      placeholder="e.g. Acme Corp"
                    />
                    {formErrors.companyName && <span className="field-error">{formErrors.companyName}</span>}
                  </div>

                  <div className="field">
                    <label className="field-label">Job Role <span className="required">*</span></label>
                    <input
                      type="text"
                      className={`field-input ${formErrors.jobRole ? 'field-input--error' : ''}`}
                      value={formData.jobRole}
                      onChange={(e) => setFormData({ ...formData, jobRole: e.target.value })}
                      placeholder="e.g. Software Engineer"
                    />
                    {formErrors.jobRole && <span className="field-error">{formErrors.jobRole}</span>}
                  </div>
                </div>

                <div className="form-row">
                  <div className="field">
                    <label className="field-label">Job Type</label>
                    <select
                      className="field-input"
                      value={formData.jobType}
                      onChange={(e) => setFormData({ ...formData, jobType: e.target.value })}
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Internship">Internship</option>
                      <option value="Contract">Contract</option>
                    </select>
                  </div>

                  <div className="field">
                    <label className="field-label">Work Mode</label>
                    <select
                      className="field-input"
                      value={formData.workMode}
                      onChange={(e) => setFormData({ ...formData, workMode: e.target.value })}
                    >
                      <option value="Hybrid">Hybrid</option>
                      <option value="On-site">On-site</option>
                      <option value="Remote">Remote</option>
                    </select>
                  </div>

                  <div className="field">
                    <label className="field-label">Status</label>
                    <select
                      className="field-input"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="OPEN">OPEN</option>
                      <option value="CLOSED">CLOSED</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="field">
                    <label className="field-label">Location</label>
                    <input
                      type="text"
                      className="field-input"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g. Bengaluru, India"
                    />
                  </div>

                  <div className="field">
                    <label className="field-label">Package / Stipend</label>
                    <input
                      type="text"
                      className="field-input"
                      value={formData.packageDetails}
                      onChange={(e) => setFormData({ ...formData, packageDetails: e.target.value })}
                      placeholder="e.g. 12 LPA or 50,000/pm"
                    />
                  </div>

                  <div className="field">
                    <label className="field-label">Application Deadline</label>
                    <input
                      type="date"
                      className="field-input"
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    />
                  </div>
                </div>

                <div className="field">
                  <label className="field-label">Application Link (HTTP/HTTPS) <span className="required">*</span></label>
                  <input
                    type="url"
                    className={`field-input ${formErrors.applicationLink ? 'field-input--error' : ''}`}
                    value={formData.applicationLink}
                    onChange={(e) => setFormData({ ...formData, applicationLink: e.target.value })}
                    placeholder="https://careers.company.com/job/123"
                  />
                  {formErrors.applicationLink && <span className="field-error">{formErrors.applicationLink}</span>}
                </div>

                <div className="field">
                  <label className="field-label">Eligibility Criteria</label>
                  <input
                    type="text"
                    className="field-input"
                    value={formData.eligibility}
                    onChange={(e) => setFormData({ ...formData, eligibility: e.target.value })}
                    placeholder="e.g. B.Tech CSE 2026 Batch, CGPA >= 7.5"
                  />
                </div>

                <div className="field">
                  <label className="field-label">Description / Notes</label>
                  <textarea
                    rows={4}
                    className="field-input field-textarea"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Detailed job responsibilities, skills required..."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsFormOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : editingOpening ? 'Save Changes' : 'Publish Opening'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingOpening && (
        <div className="modal-backdrop" onClick={() => setDeletingOpening(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
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
          </div>
        </div>
      )}
    </div>
  );
}
