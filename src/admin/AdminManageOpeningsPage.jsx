import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useAdminOpeningsQuery, invalidateOpeningQueries } from '../api/queries';
import axiosInstance from '../api/axiosInstance';
import { COMMON_BRANCHES, LEGACY_BRANCH_MAPPING, DEGREE_TYPES } from '../lib/constants';
import DatePickerPopover from '../components/DatePickerPopover';
import './AdminOpeningsPage.css';

const STUDY_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

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
    minCgpa: '',
    maxBacklogs: '',
  });

  const [yearStart, setYearStart] = useState('1st Year');
  const [yearEnd, setYearEnd] = useState('4th Year');

  const [isAllBranches, setIsAllBranches] = useState(false);
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [customBranchInput, setCustomBranchInput] = useState('');
  const [selectedDegrees, setSelectedDegrees] = useState([]);

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

    const degRaw = opening.degreeTypes || opening.degree || '';
    const degrees = degRaw
      ? degRaw.split(',').map(d => d.trim()).filter(Boolean)
      : [];
    setSelectedDegrees(degrees);

    const branchesRaw = opening.eligibleBranches || '';
    if (branchesRaw === 'ALL') {
      setIsAllBranches(true);
      setSelectedBranches([]);
    } else {
      setIsAllBranches(false);
      const branches = branchesRaw
        ? branchesRaw.split(',').map(b => b.trim()).filter(Boolean).map(b => LEGACY_BRANCH_MAPPING[b] || b)
        : [];
      setSelectedBranches(branches);
    }

    // Populate Year of Study Range
    const yRaw = opening.yearOfStudy || 'All Years';
    if (!yRaw || yRaw === 'All Years' || yRaw === '1st Year - 4th Year' || yRaw === '1st Year to 4th Year') {
      setYearStart('1st Year');
      setYearEnd('4th Year');
    } else if (yRaw.includes('-') || yRaw.includes('to') || yRaw.includes('→')) {
      const parts = yRaw.split(/[-→]|to/).map(s => s.trim());
      if (parts.length === 2 && STUDY_YEARS.includes(parts[0]) && STUDY_YEARS.includes(parts[1])) {
        setYearStart(parts[0]);
        setYearEnd(parts[1]);
      } else {
        setYearStart('1st Year');
        setYearEnd('4th Year');
      }
    } else if (STUDY_YEARS.includes(yRaw.trim())) {
      setYearStart(yRaw.trim());
      setYearEnd(yRaw.trim());
    } else {
      setYearStart('1st Year');
      setYearEnd('4th Year');
    }

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
      minCgpa: opening.minCgpa != null ? String(opening.minCgpa) : '',
      maxBacklogs: opening.maxBacklogs != null ? String(opening.maxBacklogs) : '',
    });
  };

  const toggleDegreeChip = (degreeType) => {
    if (selectedDegrees.includes(degreeType)) {
      setSelectedDegrees(selectedDegrees.filter(d => d !== degreeType));
    } else {
      setSelectedDegrees([...selectedDegrees, degreeType]);
    }
  };

  const handleAllBranchesToggle = () => {
    setIsAllBranches(prev => {
      const next = !prev;
      if (next) {
        setSelectedBranches([]);
      } else {
        setSelectedBranches([]);
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
      errs.applicationLink = 'Valid application URL (e.g. https://company.com/careers) is required';
    }

    if (selectedDegrees.length === 0) {
      errs.degreeTypes = 'Please select at least one degree type.';
    }

    if (!isAllBranches && selectedBranches.length === 0) {
      errs.branches = 'Please select at least one eligible branch.';
    }

    const startIdx = STUDY_YEARS.indexOf(yearStart);
    const endIdx = STUDY_YEARS.indexOf(yearEnd);
    if (startIdx > endIdx) {
      errs.yearOfStudy = 'Start year cannot be after end year';
    }

    if (formData.minCgpa !== '' && formData.minCgpa != null) {
      const cg = parseFloat(formData.minCgpa);
      if (isNaN(cg) || cg < 0.0 || cg > 10.0) {
        errs.minCgpa = 'Minimum CGPA must be a number between 0.0 and 10.0';
      }
    }

    if (formData.maxBacklogs !== '' && formData.maxBacklogs != null) {
      const mb = parseInt(formData.maxBacklogs, 10);
      if (isNaN(mb) || mb < 0) {
        errs.maxBacklogs = 'Maximum backlogs must be a non-negative integer';
      }
    }

    if (formData.description && formData.description.length > 2000) {
      errs.description = 'Short JD description cannot exceed 2000 characters';
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

    const degreeTypesStr = selectedDegrees.join(', ');
    const branchesStr = isAllBranches ? 'ALL' : selectedBranches.join(', ');
    const normalizedUrl = normalizeUrlInput(formData.applicationLink);
    const minCgpaVal = formData.minCgpa !== '' ? parseFloat(formData.minCgpa) : null;
    const maxBacklogsVal = formData.maxBacklogs !== '' ? parseInt(formData.maxBacklogs, 10) : null;

    let yearFormatted = 'All Years';
    if (yearStart === yearEnd) {
      yearFormatted = yearStart;
    } else if (yearStart === '1st Year' && yearEnd === '4th Year') {
      yearFormatted = 'All Years';
    } else {
      yearFormatted = `${yearStart} - ${yearEnd}`;
    }

    const payload = {
      ...formData,
      applicationLink: normalizedUrl,
      packageDetails: formattedPackage || formData.packageDetails,
      degree: degreeTypesStr,
      degreeTypes: degreeTypesStr,
      eligibleBranches: branchesStr,
      minCgpa: minCgpaVal,
      maxBacklogs: maxBacklogsVal,
      yearOfStudy: yearFormatted,
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

      <div className="admin-form-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg, 12px)', padding: '1.5rem', maxWidth: '820px', margin: '0 auto' }}>
        <form onSubmit={handleFormSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Row 1: Company & Role */}
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

          {/* Row 2: Job Type, Work Mode, Status */}
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

          {/* Row 3: Location & Package */}
          <div className="form-row">
            <div className="field" style={{ flex: 1 }}>
              <label className="field-label">Location</label>
              <input
                type="text"
                className="field-input"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. Bengaluru, India"
              />
            </div>

            <div className="field" style={{ flex: 1 }}>
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
          </div>

          {/* Row 4: Application Link & Deadline */}
          <div className="form-row">
            <div className="field" style={{ flex: 2 }}>
              <label className="field-label">Application Link <span className="required">*</span></label>
              <input
                type="text"
                className={`field-input ${formErrors.applicationLink ? 'field-input--error' : ''}`}
                value={formData.applicationLink}
                onChange={(e) => setFormData({ ...formData, applicationLink: e.target.value })}
                placeholder="https://company.com/careers"
              />
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

          {/* Eligibility Section Group */}
          <div className="structured-eligibility-group" style={{ background: 'var(--surface-sunken, #F8F6F0)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Eligibility Criteria</h3>

            <div className="form-row">
              {/* Year of Study Range Selector */}
              <div className="field" style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label className="field-label" style={{ marginBottom: 0 }}>Year of Study Range</label>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', padding: 0 }}
                    onClick={() => {
                      setYearStart('1st Year');
                      setYearEnd('4th Year');
                    }}
                  >
                    Select All Years
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>From:</span>
                    <select
                      className="field-input field-select"
                      style={{ flex: 1 }}
                      value={yearStart}
                      onChange={(e) => setYearStart(e.target.value)}
                    >
                      {STUDY_YEARS.map(yr => (
                        <option key={yr} value={yr}>{yr}</option>
                      ))}
                    </select>
                  </div>

                  <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '600' }}>→</span>

                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>To:</span>
                    <select
                      className="field-input field-select"
                      style={{ flex: 1 }}
                      value={yearEnd}
                      onChange={(e) => setYearEnd(e.target.value)}
                    >
                      {STUDY_YEARS.map(yr => (
                        <option key={yr} value={yr}>{yr}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {formErrors.yearOfStudy && <span className="field-error" style={{ marginTop: '4px', display: 'block' }}>{formErrors.yearOfStudy}</span>}
              </div>
            </div>

            {/* Degree Types Selection */}
            <div className="field">
              <label className="field-label" style={{ marginBottom: '8px', display: 'block' }}>
                Degree Types <span style={{ color: 'var(--danger, #EF4444)' }}>*</span>
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                {DEGREE_TYPES.map(deg => {
                  const isSelected = selectedDegrees.includes(deg);
                  return (
                    <button
                      type="button"
                      key={deg}
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
                      onClick={() => toggleDegreeChip(deg)}
                    >
                      {isSelected ? '✓ ' : '+ '}{deg}
                    </button>
                  );
                })}
              </div>
              {formErrors.degreeTypes && <span className="field-error" style={{ display: 'block' }}>{formErrors.degreeTypes}</span>}
            </div>

            {/* Branches Selection */}
            <div className="field">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
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
                    <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
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

            {/* Row for CGPA & Backlogs */}
            <div className="form-row">
              <div className="field" style={{ flex: 1 }}>
                <label className="field-label">Minimum CGPA</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  className={`field-input ${formErrors.minCgpa ? 'field-input--error' : ''}`}
                  placeholder="e.g. 7.5 (optional)"
                  value={formData.minCgpa}
                  onChange={(e) => setFormData({ ...formData, minCgpa: e.target.value })}
                />
                {formErrors.minCgpa && <span className="field-error">{formErrors.minCgpa}</span>}
              </div>

              <div className="field" style={{ flex: 1 }}>
                <label className="field-label">Maximum Backlogs</label>
                <input
                  type="number"
                  min="0"
                  className={`field-input ${formErrors.maxBacklogs ? 'field-input--error' : ''}`}
                  placeholder="e.g. 2 (optional)"
                  value={formData.maxBacklogs}
                  onChange={(e) => setFormData({ ...formData, maxBacklogs: e.target.value })}
                />
                {formErrors.maxBacklogs && <span className="field-error">{formErrors.maxBacklogs}</span>}
              </div>
            </div>
          </div>

          {/* Short JD Section (Renamed from Mini JD) */}
          <div className="field">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="field-label" style={{ marginBottom: 0 }}>Short JD</label>
              <span style={{ fontSize: '0.75rem', color: formData.description.length > 2000 ? 'var(--danger)' : 'var(--text-secondary)' }}>
                {formData.description.length}/2000
              </span>
            </div>
            <textarea
              rows={5}
              maxLength={2000}
              className={`field-input field-textarea ${formErrors.description ? 'field-input--error' : ''}`}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Concise job description: role, key responsibilities, required skills, technical requirements..."
            />
            {formErrors.description && <span className="field-error">{formErrors.description}</span>}
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '0.5rem' }}>
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
