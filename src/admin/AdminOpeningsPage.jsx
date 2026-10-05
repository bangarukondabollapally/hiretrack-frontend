import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import { useAuth } from '../auth/AuthContext';
import { useAdminOpeningsQuery, invalidateOpeningQueries } from '../api/queries';
import axiosInstance from '../api/axiosInstance';
import QueryStateNotice from '../components/QueryStateNotice';
import DatePickerPopover from '../components/DatePickerPopover';
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

  // Structured eligibility fields
  const COMMON_BRANCHES = ['CSE', 'IT', 'ECE', 'EEE', 'ME', 'CE', 'AI/ML', 'Data Science', 'Software Engineering'];
  const [degree, setDegree] = useState('B.Tech');
  const [selectedBranches, setSelectedBranches] = useState(['CSE', 'IT', 'ECE']);
  const [customBranchInput, setCustomBranchInput] = useState('');
  const [gradYearStart, setGradYearStart] = useState('2026');
  const [gradYearEnd, setGradYearEnd] = useState('2027');
  const [eligibilityNote, setEligibilityNote] = useState('');

  const lastFocusedRef = useRef(null);
  const deleteLastFocusedRef = useRef(null);
  const firstInputRef = useRef(null);

  const openCreateForm = () => {
    lastFocusedRef.current = document.activeElement;
    setEditingOpening(null);
    setCurrency('₹');
    setPackageAmount('');
    setDegree('B.Tech');
    setSelectedBranches(['CSE', 'IT', 'ECE']);
    setCustomBranchInput('');
    setGradYearStart('2026');
    setGradYearEnd('2027');
    setEligibilityNote('');
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

  useEffect(() => {
    if (!isFormOpen) return;
    const timer = setTimeout(() => {
      if (firstInputRef.current && typeof firstInputRef.current.focus === 'function') {
        firstInputRef.current.focus();
      }
    }, 50);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsFormOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      if (
        lastFocusedRef.current &&
        document.body.contains(lastFocusedRef.current) &&
        typeof lastFocusedRef.current.focus === 'function'
      ) {
        lastFocusedRef.current.focus();
      }
    };
  }, [isFormOpen]);

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

  const openEditForm = (opening) => {
    lastFocusedRef.current = document.activeElement;
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

    setDegree(opening.degree || 'B.Tech');
    const branches = opening.eligibleBranches
      ? opening.eligibleBranches.split(',').map(b => b.trim()).filter(Boolean)
      : ['CSE', 'IT', 'ECE'];
    setSelectedBranches(branches);
    setCustomBranchInput('');
    setGradYearStart(opening.graduationYearStart ? String(opening.graduationYearStart) : '2026');
    setGradYearEnd(opening.graduationYearEnd ? String(opening.graduationYearEnd) : '2027');
    setEligibilityNote(opening.eligibilityNote || '');

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

  const toggleBranchChip = (branch) => {
    if (selectedBranches.includes(branch)) {
      setSelectedBranches(selectedBranches.filter(b => b !== branch));
    } else {
      setSelectedBranches([...selectedBranches, branch]);
    }
  };

  const handleAddCustomBranch = (e) => {
    if ((e.key === 'Enter' || e.type === 'click') && customBranchInput.trim()) {
      e.preventDefault();
      const val = customBranchInput.trim();
      if (!selectedBranches.includes(val)) {
        setSelectedBranches([...selectedBranches, val]);
      }
      setCustomBranchInput('');
    }
  };

  const removeBranchChip = (branch) => {
    setSelectedBranches(selectedBranches.filter(b => b !== branch));
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

    if (gradYearStart && gradYearEnd) {
      const s = parseInt(gradYearStart, 10);
      const e = parseInt(gradYearEnd, 10);
      if (isNaN(s) || isNaN(e) || s > e) {
        errs.gradYears = 'Start graduation year must be less than or equal to end year';
      }
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

    const branchesStr = selectedBranches.join(', ');
    const startYearNum = gradYearStart ? parseInt(gradYearStart, 10) : null;
    const endYearNum = gradYearEnd ? parseInt(gradYearEnd, 10) : null;

    const payload = {
      ...formData,
      packageDetails: formattedPackage || formData.packageDetails,
      degree,
      eligibleBranches: branchesStr,
      graduationYearStart: startYearNum,
      graduationYearEnd: endYearNum,
      eligibilityNote,
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
                    {op.publishedBy && (
                      <span className="meta-tag meta-tag--published">
                        Published by {op.publishedBy}
                      </span>
                    )}
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
                        ref={firstInputRef}
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
                      <DatePickerPopover
                        value={formData.deadline}
                        onChange={(val) => setFormData({ ...formData, deadline: val })}
                        placeholder="Select deadline date"
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

                  {/* Structured Eligibility Section */}
                  <div className="structured-eligibility-group" style={{ background: 'var(--surface-sunken, #F3F1EC)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border, #DDD8CE)' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>Structured Eligibility</h3>
                    
                    <div className="form-row" style={{ marginBottom: '0.75rem' }}>
                      <div className="field">
                        <label className="field-label">Degree <span className="required">*</span></label>
                        <select
                          className="field-input field-select"
                          value={degree}
                          onChange={(e) => setDegree(e.target.value)}
                        >
                          <option value="B.Tech">B.Tech</option>
                          <option value="M.Tech">M.Tech</option>
                          <option value="MBA">MBA</option>
                          <option value="BCA">BCA</option>
                          <option value="MCA">MCA</option>
                          <option value="B.Sc">B.Sc</option>
                          <option value="M.Sc">M.Sc</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div className="field">
                        <label className="field-label">Graduation Year Range</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="number"
                            className="field-input"
                            placeholder="From (2026)"
                            value={gradYearStart}
                            onChange={(e) => setGradYearStart(e.target.value)}
                            min="2000"
                            max="2100"
                          />
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>to</span>
                          <input
                            type="number"
                            className="field-input"
                            placeholder="To (2027)"
                            value={gradYearEnd}
                            onChange={(e) => setGradYearEnd(e.target.value)}
                            min="2000"
                            max="2100"
                          />
                        </div>
                        {formErrors.gradYears && <span className="field-error">{formErrors.gradYears}</span>}
                      </div>
                    </div>

                    <div className="field" style={{ marginBottom: '0.75rem' }}>
                      <label className="field-label">Courses / Branches</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                        {COMMON_BRANCHES.map(branch => {
                          const isSelected = selectedBranches.includes(branch);
                          return (
                            <button
                              type="button"
                              key={branch}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '16px',
                                border: '1px solid ' + (isSelected ? 'var(--accent, #2563EB)' : 'var(--border, #DDD8CE)'),
                                background: isSelected ? 'var(--accent-light, #EFF6FF)' : 'var(--surface, #FFFFFF)',
                                color: isSelected ? 'var(--accent, #2563EB)' : 'var(--text-secondary, #4D4A43)',
                                fontSize: '0.8rem',
                                fontWeight: isSelected ? '600' : '400',
                                cursor: 'pointer',
                              }}
                              onClick={() => toggleBranchChip(branch)}
                            >
                              {isSelected ? '✓ ' : '+ '}{branch}
                            </button>
                          );
                        })}
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="text"
                          className="field-input"
                          style={{ flex: 1 }}
                          placeholder="Add custom branch and press Enter..."
                          value={customBranchInput}
                          onChange={(e) => setCustomBranchInput(e.target.value)}
                          onKeyDown={handleAddCustomBranch}
                        />
                        <button type="button" className="btn-secondary btn-sm" onClick={handleAddCustomBranch}>
                          Add
                        </button>
                      </div>

                      {selectedBranches.length > 0 && (
                        <div style={{ marginTop: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          Selected: {selectedBranches.map(b => (
                            <span key={b} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'var(--surface)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border)', marginRight: '4px', marginTop: '4px' }}>
                              {b}
                              <button type="button" style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, marginLeft: '2px', color: '#999' }} onClick={() => removeBranchChip(b)}>×</button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="field">
                      <label className="field-label">Optional Extra Note</label>
                      <input
                        type="text"
                        className="field-input"
                        placeholder="e.g. Min 60% aggregate in X, XII & B.Tech"
                        value={eligibilityNote}
                        onChange={(e) => setEligibilityNote(e.target.value)}
                      />
                    </div>
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
