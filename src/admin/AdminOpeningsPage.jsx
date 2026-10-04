import { useState } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import { useAuth } from '../auth/AuthContext';
import { useAdminOpeningsQuery, invalidateOpeningQueries } from '../api/queries';
import axiosInstance from '../api/axiosInstance';
import QueryStateNotice from '../components/QueryStateNotice';
import { modalBackdropVariants, modalCardVariants, listItemVariants } from '../lib/motion';
import './AdminOpeningsPage.css';

export default function AdminOpeningsPage() {
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

  const [currency, setCurrency] = useState('₹');
  const [packageAmount, setPackageAmount] = useState('');

  // Enhanced eligibility fields
  const [targetBatch, setTargetBatch] = useState('2026 Batch');
  const [minCgpa, setMinCgpa] = useState('CGPA ≥ 7.0');
  const [eligibleBranches, setEligibleBranches] = useState('B.Tech CSE, IT, ECE');
  const [customCriteria, setCustomCriteria] = useState('');

  const openCreateForm = () => {
    setEditingOpening(null);
    setCurrency('₹');
    setPackageAmount('');
    setTargetBatch('2026 Batch');
    setMinCgpa('CGPA ≥ 7.0');
    setEligibleBranches('B.Tech CSE, IT, ECE');
    setCustomCriteria('');
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

    // Extract currency if present
    let rawPkg = opening.packageDetails || '';
    let foundCurr = '₹';
    if (rawPkg.startsWith('$')) { foundCurr = '$'; rawPkg = rawPkg.replace('$', '').trim(); }
    else if (rawPkg.startsWith('€')) { foundCurr = '€'; rawPkg = rawPkg.replace('€', '').trim(); }
    else if (rawPkg.startsWith('₩')) { foundCurr = '₩'; rawPkg = rawPkg.replace('₩', '').trim(); }
    else if (rawPkg.startsWith('¥')) { foundCurr = '¥'; rawPkg = rawPkg.replace('¥', '').trim(); }
    else if (rawPkg.startsWith('£')) { foundCurr = '£'; rawPkg = rawPkg.replace('£', '').trim(); }
    else if (rawPkg.startsWith('₹')) { foundCurr = '₹'; rawPkg = rawPkg.replace('₹', '').trim(); }

    setCurrency(foundCurr);
    setPackageAmount(rawPkg);

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
    setCustomCriteria(opening.eligibility || '');
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

    // Format package details with currency
    let formattedPackage = packageAmount.trim();
    if (formattedPackage && !/^[₹$€₩¥£A\$]/.test(formattedPackage)) {
      formattedPackage = `${currency} ${formattedPackage}`;
    } else if (!formattedPackage && packageAmount) {
      formattedPackage = `${currency} ${packageAmount}`;
    }

    // Compile eligibility criteria
    let compiledEligibility = customCriteria.trim();
    if (!compiledEligibility) {
      const parts = [eligibleBranches, targetBatch, minCgpa].filter(Boolean);
      compiledEligibility = parts.join(' | ');
    }

    const payload = {
      ...formData,
      packageDetails: formattedPackage || formData.packageDetails,
      eligibility: compiledEligibility || formData.eligibility
    };

    try {
      if (editingOpening) {
        await axiosInstance.put(`/api/admin/openings/${editingOpening.id}`, payload);
        setSuccessMsg(`Placement opening for "${formData.companyName}" updated.`);
      } else {
        await axiosInstance.post('/api/admin/openings', payload);
        setSuccessMsg(`Placement opening for "${formData.companyName}" created.`);
      }

      setIsFormOpen(false);
      invalidateOpeningQueries(userId);
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
      invalidateOpeningQueries(userId);
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
      invalidateOpeningQueries(userId);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
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
            {openings.map(op => {
              const isClosed = op.status === 'CLOSED';
              return (
                <m.div
                  key={op.id}
                  layout
                  variants={listItemVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className={`admin-opening-card ${isClosed ? 'admin-opening-card--closed' : ''}`}
                >
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
                    {op.location && (
                      <span className="meta-tag">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '3px' }}>
                          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                          <circle cx="12" cy="10" r="3"/>
                        </svg>
                        {op.location}
                      </span>
                    )}
                    {op.packageDetails && (
                      <span className="meta-tag meta-tag--package">
                        {op.packageDetails}
                      </span>
                    )}
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
                </m.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Create / Edit Form Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <m.div
            className="modal-backdrop"
            variants={modalBackdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={() => setIsFormOpen(false)}
          >
            <m.div
              className="modal-card modal-card--lg"
              variants={modalCardVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
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
                        className="field-input field-select"
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
                        className="field-input field-select"
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
                        className="field-input field-select"
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
                      <label className="field-label">Currency & Amount (Default: ₹ INR)</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <select
                          className="field-input field-select"
                          style={{ width: '100px', flexShrink: 0 }}
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value)}
                        >
                          <option value="₹">₹ (INR)</option>
                          <option value="$">$ (USD)</option>
                          <option value="€">€ (EUR)</option>
                          <option value="₩">₩ (KRW)</option>
                          <option value="¥">¥ (JPY)</option>
                          <option value="£">£ (GBP)</option>
                          <option value="A$">A$ (AUD)</option>
                        </select>
                        <input
                          type="text"
                          className="field-input"
                          style={{ flex: 1 }}
                          value={packageAmount}
                          onChange={(e) => setPackageAmount(e.target.value)}
                          placeholder="e.g. 12 LPA or 50,000/pm"
                        />
                      </div>
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

                  {/* Enhanced Eligibility Criteria Section */}
                  <div className="eligibility-builder-section">
                    <label className="field-label">Eligibility Criteria Builder</label>
                    <div className="form-row" style={{ marginBottom: '8px' }}>
                      <input
                        type="text"
                        className="field-input"
                        value={eligibleBranches}
                        onChange={(e) => setEligibleBranches(e.target.value)}
                        placeholder="Branches e.g. B.Tech CSE, IT, ECE"
                      />
                      <input
                        type="text"
                        className="field-input"
                        value={targetBatch}
                        onChange={(e) => setTargetBatch(e.target.value)}
                        placeholder="Batch e.g. 2026 Batch"
                      />
                      <input
                        type="text"
                        className="field-input"
                        value={minCgpa}
                        onChange={(e) => setMinCgpa(e.target.value)}
                        placeholder="Min Criteria e.g. CGPA ≥ 7.5"
                      />
                    </div>
                    <input
                      type="text"
                      className="field-input"
                      value={customCriteria}
                      onChange={(e) => setCustomCriteria(e.target.value)}
                      placeholder="Custom Eligibility Summary (overrides builder if filled)"
                    />
                  </div>

                  <div className="field" style={{ marginTop: '12px' }}>
                    <label className="field-label">Description / Notes</label>
                    <textarea
                      rows={4}
                      className="field-input field-textarea"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Detailed job responsibilities, required skills, interview rounds..."
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={() => setIsFormOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? 'Publishing...' : editingOpening ? 'Save Changes' : 'Publish Opening'}
                  </button>
                </div>
              </form>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>

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
