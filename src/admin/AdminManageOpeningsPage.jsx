import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useAdminOpeningsQuery, invalidateOpeningQueries } from '../api/queries';
import axiosInstance from '../api/axiosInstance';
import DatePickerPopover from '../components/DatePickerPopover';
import './AdminOpeningsPage.css';

const COMMON_BRANCHES = ['CSE', 'IT', 'ECE', 'EEE', 'ME', 'CE', 'AI/ML', 'Data Science', 'Software Engineering'];
const YEAR_OF_STUDY_OPTIONS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'All Years'];

function normalizeUrlInput(rawUrl) {
  if (!rawUrl) return '';
  let trimmed = rawUrl.trim();
  if (!trimmed) return '';
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }
  return trimmed;
}

function validateUrl(urlStr) {
  try {
    const parsed = new URL(urlStr);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

export default function AdminManageOpeningsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  const { user } = useAuth();
  const userId = user?.userId || user?.id || user?.email;

  const { data: openings = [] } = useAdminOpeningsQuery(userId);

  const [editingOpening, setEditingOpening] = useState(null);
  const [formData, setFormData] = useState({
    companyName: '',
    jobRole: '',
    jobType: 'Full-time',
    location: '',
    workMode: 'Hybrid',
    packageDetails: '',
    deadline: '',
    description: '',
    applicationLink: '',
    status: 'OPEN',
    seats: '',
    yearOfStudy: 'All Years',
  });

  const [isAllBranches, setIsAllBranches] = useState(false);
  const [selectedBranches, setSelectedBranches] = useState(['CSE', 'IT', 'ECE']);
  const [customBranchInput, setCustomBranchInput] = useState('');
  const [degree, setDegree] = useState('B.Tech');
  const [eligibilityNote, setEligibilityNote] = useState('');

  const [currency, setCurrency] = useState('₹');
  const [packageAmount, setPackageAmount] = useState('');

  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const firstInputRef = useRef(null);

  // Load opening if editId is provided
  useEffect(() => {
    if (editId && openings.length > 0) {
      const found = openings.find(o => String(o.id) === String(editId));
      if (found) {
        setEditingOpening(found);
        populateForm(found);
      }
    }
  }, [editId, openings]);

  const populateForm = (opening) => {
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

    const branchesRaw = opening.eligibleBranches || '';
    if (branchesRaw === 'ALL') {
      setIsAllBranches(true);
      setSelectedBranches([]);
    } else {
      setIsAllBranches(false);
      const branches = branchesRaw
        ? branchesRaw.split(',').map(b => b.trim()).filter(Boolean)
        : ['CSE', 'IT', 'ECE'];
      setSelectedBranches(branches);
    }

    setEligibilityNote(opening.eligibilityNote || '');

    setFormData({
      companyName: opening.companyName || '',
      jobRole: opening.jobRole || '',
      jobType: opening.jobType || 'Full-time',
      location: opening.location || '',
      workMode: opening.workMode || 'Hybrid',
      packageDetails: opening.packageDetails || '',
      deadline: opening.deadline || '',
      description: opening.description || '',
      applicationLink: opening.applicationLink || '',
      status: opening.status || 'OPEN',
      seats: opening.seats != null ? String(opening.seats) : '',
      yearOfStudy: opening.yearOfStudy || 'All Years',
    });
  };

  const handleAllBranchesToggle = () => {
    setIsAllBranches(prev => {
      const next = !prev;
      if (next) {
        setSelectedBranches([]);
      } else {
        setSelectedBranches(['CSE', 'IT', 'ECE']);
      }
      return next;
    });
  };

  const toggleBranchChip = (branch) => {
    if (isAllBranches) return;
    if (selectedBranches.includes(branch)) {
      setSelectedBranches(selectedBranches.filter(b => b !== branch));
    } else {
      setSelectedBranches([...selectedBranches, branch]);
    }
  };

  const handleAddCustomBranch = (e) => {
    if ((e.key === 'Enter' || e.type === 'click') && customBranchInput.trim()) {
      e.preventDefault();
      if (isAllBranches) return;
      const val = customBranchInput.trim();
      if (!selectedBranches.includes(val)) {
        setSelectedBranches([...selectedBranches, val]);
      }
      setCustomBranchInput('');
    }
  };

  const removeBranchChip = (branch) => {
    if (isAllBranches) return;
    setSelectedBranches(selectedBranches.filter(b => b !== branch));
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.companyName.trim()) errs.companyName = 'Company name is required';
    if (!formData.jobRole.trim()) errs.jobRole = 'Job role is required';

    const normalizedUrl = normalizeUrlInput(formData.applicationLink);
    if (!formData.applicationLink.trim()) {
      errs.applicationLink = 'Application link is required';
    } else if (!validateUrl(normalizedUrl)) {
      errs.applicationLink = 'Valid application URL (e.g. company.com/careers) is required';
    }

    if (!isAllBranches && selectedBranches.length === 0) {
      errs.branches = 'Select at least one branch or choose "All branches"';
    }

    if (formData.seats) {
      const s = parseInt(formData.seats, 10);
      if (isNaN(s) || s <= 0) {
        errs.seats = 'Seats must be a positive integer';
      }
    }

    if (formData.description && formData.description.length > 2000) {
      errs.description = 'Mini JD description cannot exceed 2000 characters';
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setError('');

    let formattedPackage = packageAmount.trim();
    if (formattedPackage && !/^[₹$€₩¥£A$]/.test(formattedPackage)) {
      formattedPackage = `${currency} ${formattedPackage}`;
    }

    const branchesStr = isAllBranches ? 'ALL' : selectedBranches.join(', ');
    const normalizedUrl = normalizeUrlInput(formData.applicationLink);
    const seatsVal = formData.seats ? parseInt(formData.seats, 10) : null;

    const payload = {
      ...formData,
      applicationLink: normalizedUrl,
      packageDetails: formattedPackage || formData.packageDetails,
      degree,
      eligibleBranches: branchesStr,
      eligibilityNote,
      seats: seatsVal,
      yearOfStudy: formData.yearOfStudy,
    };

    try {
      if (editingOpening) {
        await axiosInstance.put(`/api/admin/openings/${editingOpening.id}`, payload);
        setSuccessMsg(`Placement opening for "${formData.companyName}" updated successfully.`);
      } else {
        await axiosInstance.post('/api/admin/openings', payload);
        setSuccessMsg(`Placement opening for "${formData.companyName}" created successfully.`);
      }

      invalidateOpeningQueries(userId);
      setTimeout(() => {
        navigate('/admin/openings');
      }, 1200);
    } catch (err) {
      if (err.response?.status === 403) {
        setError('Access Denied: Only ADMIN users can manage placement openings.');
      } else {
        setError(err.response?.data?.message || 'Failed to save placement opening.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-openings-page">
      <div className="admin-header">
        <div>
          <h1 className="admin-title">{editingOpening ? 'Edit Placement Opening' : 'Publish New Placement Opening'}</h1>
          <p className="admin-subtitle">Fill in the job details, eligibility criteria, and application link below.</p>
        </div>
        <button type="button" className="btn-secondary" onClick={() => navigate('/admin/openings')}>
          ← Back to Openings
        </button>
      </div>

      {successMsg && <div className="admin-alert admin-alert--success">{successMsg}</div>}
      {error && <div className="admin-alert admin-alert--error">{error}</div>}

      <div className="admin-form-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg, 12px)', padding: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
        <form onSubmit={handleFormSubmit} noValidate>
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
              <label className="field-label">Package / Stipend</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  className="field-input field-select"
                  style={{ width: '90px', flexShrink: 0 }}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="₹">₹ INR</option>
                  <option value="$">$ USD</option>
                  <option value="€">€ EUR</option>
                  <option value="£">£ GBP</option>
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
              <label className="field-label">Seats (Empty = Unlimited)</label>
              <input
                type="number"
                min="1"
                className={`field-input ${formErrors.seats ? 'field-input--error' : ''}`}
                value={formData.seats}
                onChange={(e) => setFormData({ ...formData, seats: e.target.value })}
                placeholder="e.g. 50"
              />
              {formErrors.seats && <span className="field-error">{formErrors.seats}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="field" style={{ flex: 2 }}>
              <label className="field-label">Application Link <span className="required">*</span></label>
              <input
                type="text"
                className={`field-input ${formErrors.applicationLink ? 'field-input--error' : ''}`}
                value={formData.applicationLink}
                onChange={(e) => setFormData({ ...formData, applicationLink: e.target.value })}
                placeholder="company.com/careers/apply"
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px', display: 'block' }}>
                Prefix with http:// or https:// is optional; will automatically default to https://
              </span>
              {formErrors.applicationLink && <span className="field-error">{formErrors.applicationLink}</span>}
            </div>

            <div className="field" style={{ flex: 1 }}>
              <label className="field-label">Application Deadline</label>
              <DatePickerPopover
                value={formData.deadline}
                onChange={(val) => setFormData({ ...formData, deadline: val })}
                placeholder="Select deadline date"
              />
            </div>
          </div>

          {/* Eligibility Section */}
          <div className="structured-eligibility-group" style={{ background: 'var(--surface-sunken, #F8F6F0)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '1rem', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>Eligibility & Audience</h3>

            <div className="form-row" style={{ marginBottom: '0.75rem' }}>
              <div className="field">
                <label className="field-label">Degree</label>
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
                <label className="field-label">Year of Study</label>
                <select
                  className="field-input field-select"
                  value={formData.yearOfStudy}
                  onChange={(e) => setFormData({ ...formData, yearOfStudy: e.target.value })}
                >
                  {YEAR_OF_STUDY_OPTIONS.map(yr => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field" style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label className="field-label" style={{ marginBottom: 0 }}>Eligible Branches</label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--accent)' }}>
                  <input
                    type="checkbox"
                    checked={isAllBranches}
                    onChange={handleAllBranchesToggle}
                  />
                  <strong>All branches eligible</strong>
                </label>
              </div>

              {!isAllBranches && (
                <>
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
                            border: '1px solid ' + (isSelected ? 'var(--accent)' : 'var(--border)'),
                            background: isSelected ? 'var(--accent-light, #EFF6FF)' : 'var(--surface)',
                            color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
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
                      Selected ({selectedBranches.length}): {selectedBranches.map(b => (
                        <span key={b} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'var(--surface)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border)', marginRight: '4px', marginTop: '4px' }}>
                          {b}
                          <button type="button" style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, marginLeft: '2px', color: '#999' }} onClick={() => removeBranchChip(b)}>×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}

              {formErrors.branches && <span className="field-error" style={{ marginTop: '4px', display: 'block' }}>{formErrors.branches}</span>}
            </div>

            <div className="field">
              <label className="field-label">Additional Eligibility Notes</label>
              <input
                type="text"
                className="field-input"
                placeholder="e.g. Min 60% aggregate in X, XII & B.Tech"
                value={eligibilityNote}
                onChange={(e) => setEligibilityNote(e.target.value)}
              />
            </div>
          </div>

          <div className="field" style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label className="field-label" style={{ marginBottom: 0 }}>Mini JD (Job Description)</label>
              <span style={{ fontSize: '0.75rem', color: formData.description.length > 2000 ? 'var(--danger)' : 'var(--text-secondary)' }}>
                {formData.description.length}/2000 characters
              </span>
            </div>
            <textarea
              rows={5}
              maxLength={2000}
              className={`field-input field-textarea ${formErrors.description ? 'field-input--error' : ''}`}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Concise Job Description: key responsibilities, required skills, selection process..."
            />
            {formErrors.description && <span className="field-error">{formErrors.description}</span>}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '1.5rem' }}>
            <button type="button" className="btn-secondary" onClick={() => navigate('/admin/openings')}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingOpening ? 'Update Opening' : 'Publish Opening'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
