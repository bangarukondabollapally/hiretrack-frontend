import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../auth/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { extractTextFromFile } from '../lib/fileParser';
import './ProfilePage.css';

const TABS_STUDENT = [
  {
    id: 'account',
    label: 'Account',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    id: 'job-search',
    label: 'Job search',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="22" y1="12" x2="18" y2="12" />
        <line x1="6" y1="12" x2="2" y2="12" />
        <line x1="12" y1="6" x2="12" y2="2" />
        <line x1="12" y1="22" x2="12" y2="18" />
      </svg>
    ),
  },
];

const TABS_ADMIN = [
  {
    id: 'account',
    label: 'Account',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    id: 'placement-office',
    label: 'Placement Office',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
  },
];

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const isAdmin = user?.role === 'ADMIN';
  const tabs = isAdmin ? TABS_ADMIN : TABS_STUDENT;

  // Active tab synchronized with URL ?tab= parameter
  const tabParam = searchParams.get('tab');
  let activeTab = tabParam;
  if (isAdmin) {
    if (activeTab !== 'account' && activeTab !== 'placement-office') {
      activeTab = 'placement-office';
    }
  } else {
    if (activeTab !== 'account' && activeTab !== 'job-search') {
      activeTab = 'job-search';
    }
  }

  useEffect(() => {
    if (isAdmin && (searchParams.get('tab') === 'job-search' || searchParams.get('tab') === 'resume')) {
      setSearchParams({ tab: 'placement-office' }, { replace: true });
    } else if (!isAdmin && searchParams.get('tab') === 'resume') {
      setSearchParams({ tab: 'job-search' }, { replace: true });
    }
  }, [isAdmin, searchParams, setSearchParams]);

  const setActiveTab = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  // Profile data & initial state for change tracking (dirty check)
  const [name, setName] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [experienceSummary, setExperienceSummary] = useState('');
  const [resumeText, setResumeText] = useState('');

  const [initialName, setInitialName] = useState('');
  const [initialTargetRole, setInitialTargetRole] = useState('');
  const [initialYearsOfExperience, setInitialYearsOfExperience] = useState('');
  const [initialExperienceSummary, setInitialExperienceSummary] = useState('');
  const [initialResumeText, setInitialResumeText] = useState('');

  // Admin Placement Office settings
  const [institutionName, setInstitutionName] = useState(() => {
    try {
      const saved = localStorage.getItem('ht_admin_settings');
      return saved ? JSON.parse(saved).institutionName : 'Campus Placement Cell';
    } catch { return 'Campus Placement Cell'; }
  });
  const [adminContactEmail, setAdminContactEmail] = useState(() => {
    try {
      const saved = localStorage.getItem('ht_admin_settings');
      return saved ? JSON.parse(saved).contactEmail : user?.email || 'placements@univ.edu';
    } catch { return user?.email || 'placements@univ.edu'; }
  });
  const [defaultCurrency, setDefaultCurrency] = useState(() => {
    try {
      const saved = localStorage.getItem('ht_admin_settings');
      return saved ? JSON.parse(saved).defaultCurrency : 'INR (₹)';
    } catch { return 'INR (₹)'; }
  });
  const [adminNotify, setAdminNotify] = useState(() => {
    try {
      const saved = localStorage.getItem('ht_admin_settings');
      return saved ? JSON.parse(saved).emailNotify : true;
    } catch { return true; }
  });

  const [initialAdminSettings, setInitialAdminSettings] = useState({
    institutionName,
    adminContactEmail,
    defaultCurrency,
    adminNotify
  });
  const [adminStatus, setAdminStatus] = useState({ loading: false, success: false, error: '' });

  // Resume UI mode override: 'paste' | 'upload' | null
  const [resumeModeOverride, setResumeModeOverride] = useState(null);

  // Loading & status states
  const [isLoading, setIsLoading] = useState(true);
  const [isParsing, setIsParsing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');

  // Per-tab status feedback
  const [accountStatus, setAccountStatus] = useState({ loading: false, success: false, error: '' });
  const [jobSearchStatus, setJobSearchStatus] = useState({ loading: false, success: false, error: '' });

  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.get('/api/profile');
      const data = response.data || {};
      const fetchedName = data.name || '';
      const fetchedRole = data.targetRole || '';
      const fetchedYears = data.yearsOfExperience !== null && data.yearsOfExperience !== undefined ? String(data.yearsOfExperience) : '';
      const fetchedSummary = data.experienceSummary || '';
      const fetchedResume = data.resumeText || '';

      setName(fetchedName);
      setInitialName(fetchedName);

      setTargetRole(fetchedRole);
      setInitialTargetRole(fetchedRole);

      setYearsOfExperience(fetchedYears);
      setInitialYearsOfExperience(fetchedYears);

      setExperienceSummary(fetchedSummary);
      setInitialExperienceSummary(fetchedSummary);

      setResumeText(fetchedResume);
      setInitialResumeText(fetchedResume);
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Save Account tab
  const handleSaveAccount = async (e) => {
    e.preventDefault();
    setAccountStatus({ loading: true, success: false, error: '' });
    try {
      const res = await axiosInstance.put('/api/profile', { name });
      const updatedName = res.data?.name || name;
      setName(updatedName);
      setInitialName(updatedName);
      setAccountStatus({ loading: false, success: true, error: '' });
      setTimeout(() => setAccountStatus(prev => ({ ...prev, success: false })), 3000);
    } catch (err) {
      setAccountStatus({ loading: false, success: false, error: 'Failed to save account details.' });
    }
  };

  // Save Job Search tab (single PUT with changed fields only)
  const handleSaveJobSearch = async (e) => {
    if (e) e.preventDefault();
    setJobSearchStatus({ loading: true, success: false, error: '' });

    try {
      const payload = {};
      if (targetRole !== initialTargetRole) {
        payload.targetRole = targetRole;
      }
      if (yearsOfExperience !== initialYearsOfExperience) {
        payload.yearsOfExperience = yearsOfExperience === '' || yearsOfExperience === null ? null : Number(yearsOfExperience);
      }
      if (experienceSummary !== initialExperienceSummary) {
        payload.experienceSummary = experienceSummary;
      }
      if (resumeText !== initialResumeText) {
        payload.resumeText = resumeText;
      }

      const res = await axiosInstance.put('/api/profile', payload);
      const data = res.data || {};

      const newRole = data.targetRole || '';
      const newYears = data.yearsOfExperience !== null && data.yearsOfExperience !== undefined ? String(data.yearsOfExperience) : '';
      const newSummary = data.experienceSummary || '';
      const newResume = data.resumeText || '';

      setTargetRole(newRole);
      setInitialTargetRole(newRole);

      setYearsOfExperience(newYears);
      setInitialYearsOfExperience(newYears);

      setExperienceSummary(newSummary);
      setInitialExperienceSummary(newSummary);

      setResumeText(newResume);
      setInitialResumeText(newResume);

      setResumeModeOverride(null);
      setJobSearchStatus({ loading: false, success: true, error: '' });
      setTimeout(() => setJobSearchStatus(prev => ({ ...prev, success: false })), 3000);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save job search details.';
      setJobSearchStatus({ loading: false, success: false, error: msg });
    }
  };

  // Save Admin Placement Office settings
  const handleSaveAdminSettings = (e) => {
    if (e) e.preventDefault();
    setAdminStatus({ loading: true, success: false, error: '' });
    try {
      localStorage.setItem('ht_admin_settings', JSON.stringify({
        institutionName,
        contactEmail: adminContactEmail,
        defaultCurrency,
        emailNotify: adminNotify
      }));
      setInitialAdminSettings({
        institutionName,
        adminContactEmail,
        defaultCurrency,
        adminNotify
      });
      setAdminStatus({ loading: false, success: true, error: '' });
      setTimeout(() => setAdminStatus(prev => ({ ...prev, success: false })), 3000);
    } catch (err) {
      setAdminStatus({ loading: false, success: false, error: 'Failed to save placement settings.' });
    }
  };

  const handleRemoveResume = async () => {
    if (window.confirm('Are you sure you want to remove your stored master resume?')) {
      setJobSearchStatus({ loading: true, success: false, error: '' });
      try {
        await axiosInstance.put('/api/profile', { resumeText: '' });
        setResumeText('');
        setInitialResumeText('');
        setUploadedFileName('');
        setResumeModeOverride(null);
        setJobSearchStatus({ loading: false, success: true, error: '' });
        setTimeout(() => setJobSearchStatus(prev => ({ ...prev, success: false })), 3000);
      } catch (err) {
        setJobSearchStatus({ loading: false, success: false, error: 'Failed to remove resume.' });
      }
    }
  };

  const handleFileSelect = async (file) => {
    if (!file) return;
    setIsParsing(true);
    setJobSearchStatus({ loading: false, success: false, error: '' });

    try {
      const extractedText = await extractTextFromFile(file);
      if (!extractedText || !extractedText.trim()) {
        throw new Error('No readable text could be extracted from this file.');
      }
      setResumeText(extractedText);
      setUploadedFileName(file.name);
      setResumeModeOverride('paste');
    } catch (err) {
      setJobSearchStatus({
        loading: false,
        success: false,
        error: err.message || 'Failed to parse file. Please try pasting text instead.',
      });
    } finally {
      setIsParsing(false);
    }
  };

  // Determine current resume component sub-state
  let currentResumeState = 'empty';
  if (initialResumeText && !resumeModeOverride) {
    currentResumeState = 'saved';
  } else if (resumeModeOverride === 'paste') {
    currentResumeState = 'paste';
  } else if (resumeModeOverride === 'upload') {
    currentResumeState = 'empty';
  } else if (resumeText) {
    currentResumeState = 'paste';
  }

  const isAccountDirty = name !== initialName;
  const isJobSearchDirty =
    targetRole !== initialTargetRole ||
    yearsOfExperience !== initialYearsOfExperience ||
    experienceSummary !== initialExperienceSummary ||
    resumeText !== initialResumeText;

  const isAdminDirty =
    institutionName !== initialAdminSettings.institutionName ||
    adminContactEmail !== initialAdminSettings.adminContactEmail ||
    defaultCurrency !== initialAdminSettings.defaultCurrency ||
    adminNotify !== initialAdminSettings.adminNotify;

  const userInitial = (name || user?.email || 'U').charAt(0).toUpperCase();

  if (isLoading) {
    return <div className="settings-loading">Loading settings...</div>;
  }

  return (
    <div className="settings-page">
      <header className="settings-header">
        <h1 className="settings-title">Settings</h1>
        <p className="settings-subtitle">
          {isAdmin
            ? 'Manage administrator account preferences, placement office details, and system defaults.'
            : 'Manage your account profile, job search experience, and master resume.'}
        </p>
      </header>

      {/* User Header Profile Card */}
      <motion.div
        className="profile-user-card"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className="profile-avatar">{userInitial}</div>
        <div className="profile-user-info">
          <span className="profile-user-name">{name || user?.email?.split('@')[0] || 'HireTrack User'}</span>
          <span className="profile-user-email">{user?.email}</span>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <span className="admin-role-badge">
            {isAdmin ? '🔒 Administrator' : '🎓 Student Account'}
          </span>
        </div>
      </motion.div>

      <div className="settings-layout">
        {/* Desktop Left Nav Section List / Mobile Top Scrollable Segmented Tabs */}
        <nav className="settings-nav" aria-label="Settings sections">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              className={`settings-nav__item ${activeTab === tab.id ? 'settings-nav__item--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="settings-nav__icon" aria-hidden="true">{tab.icon}</span>
              <span className="settings-nav__label">{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Content Pane: Renders ONLY the active tab */}
        <div className="settings-content">
          {/* TAB 1: ACCOUNT */}
          {activeTab === 'account' && (
            <section className="settings-section" id="section-account">
              <div className="settings-section__header">
                <h2 className="settings-section__title">Account</h2>
                <p className="settings-section__desc">Your personal details and authentication credentials.</p>
              </div>

              <form onSubmit={handleSaveAccount} className="claude-rows-container">
                <div className="claude-row">
                  <div className="claude-row__info">
                    <label htmlFor="settings-name" className="claude-row__label">Full Name</label>
                    <p className="claude-row__desc">Your display name for account communication.</p>
                  </div>
                  <div className="claude-row__control">
                    <input
                      id="settings-name"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Jane Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="claude-row">
                  <div className="claude-row__info">
                    <span className="claude-row__label">Email Address</span>
                    <p className="claude-row__desc">Your login email address (read-only).</p>
                  </div>
                  <div className="claude-row__control">
                    <span className="read-only-value">{user?.email || '—'}</span>
                  </div>
                </div>

                {isAdmin && (
                  <div className="claude-row">
                    <div className="claude-row__info">
                      <span className="claude-row__label">Role & Permissions</span>
                      <p className="claude-row__desc">Your administrative authorization level in HireTrack.</p>
                    </div>
                    <div className="claude-row__control">
                      <span className="admin-role-badge">
                        🔒 Administrator (Full Access)
                      </span>
                    </div>
                  </div>
                )}

                <div className="claude-row">
                  <div className="claude-row__info">
                    <span className="claude-row__label">Session</span>
                    <p className="claude-row__desc">Sign out of your active HireTrack session on this browser.</p>
                  </div>
                  <div className="claude-row__control">
                    <button type="button" onClick={logout} className="btn-secondary btn-danger-outline">
                      Log out
                    </button>
                  </div>
                </div>

                <div className="settings-section__footer">
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={!isAccountDirty || accountStatus.loading}
                  >
                    {accountStatus.loading ? 'Saving...' : 'Save Account'}
                  </button>
                  {accountStatus.success && <span className="status-badge status-badge--success">Saved ✓</span>}
                  {accountStatus.error && <span className="status-badge status-badge--error">{accountStatus.error}</span>}
                </div>
              </form>
            </section>
          )}

          {/* ADMIN TAB 2: PLACEMENT OFFICE */}
          {isAdmin && activeTab === 'placement-office' && (
            <section className="settings-section" id="section-placement-office">
              <div className="settings-section__header">
                <h2 className="settings-section__title">Placement Office</h2>
                <p className="settings-section__desc">Configure institution details, contact information, and default opening preferences.</p>
              </div>

              <form onSubmit={handleSaveAdminSettings} className="claude-rows-container">
                <div className="claude-row">
                  <div className="claude-row__info">
                    <label htmlFor="settings-institution" className="claude-row__label">Institution / Office Name</label>
                    <p className="claude-row__desc">Name of your university placement cell or career services office.</p>
                  </div>
                  <div className="claude-row__control">
                    <input
                      id="settings-institution"
                      type="text"
                      className="form-input"
                      placeholder="e.g. University Career Placement Cell"
                      value={institutionName}
                      onChange={(e) => setInstitutionName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="claude-row">
                  <div className="claude-row__info">
                    <label htmlFor="settings-admin-email" className="claude-row__label">Placement Contact Email</label>
                    <p className="claude-row__desc">Official contact email displayed to students on placement postings.</p>
                  </div>
                  <div className="claude-row__control">
                    <input
                      id="settings-admin-email"
                      type="email"
                      className="form-input"
                      placeholder="e.g. placements@univ.edu"
                      value={adminContactEmail}
                      onChange={(e) => setAdminContactEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="claude-row">
                  <div className="claude-row__info">
                    <label htmlFor="settings-default-currency" className="claude-row__label">Default Opening Currency</label>
                    <p className="claude-row__desc">Default currency pre-selected when creating new placement openings.</p>
                  </div>
                  <div className="claude-row__control">
                    <select
                      id="settings-default-currency"
                      className="form-input"
                      value={defaultCurrency}
                      onChange={(e) => setDefaultCurrency(e.target.value)}
                    >
                      <option value="INR (₹)">INR (₹) - Indian Rupee</option>
                      <option value="USD ($)">USD ($) - US Dollar</option>
                      <option value="EUR (€)">EUR (€) - Euro</option>
                      <option value="GBP (£)">GBP (£) - British Pound</option>
                      <option value="KRW (₩)">KRW (₩) - Korean Won</option>
                      <option value="JPY (¥)">JPY (¥) - Japanese Yen</option>
                    </select>
                  </div>
                </div>

                <div className="claude-row">
                  <div className="claude-row__info">
                    <span className="claude-row__label">Opening Activity Notifications</span>
                    <p className="claude-row__desc">Receive summary updates when students save or track openings.</p>
                  </div>
                  <div className="claude-row__control">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px' }}>
                      <input
                        type="checkbox"
                        checked={adminNotify}
                        onChange={(e) => setAdminNotify(e.target.checked)}
                      />
                      <span>Enable email alerts</span>
                    </label>
                  </div>
                </div>

                <div className="settings-section__footer">
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={!isAdminDirty || adminStatus.loading}
                  >
                    {adminStatus.loading ? 'Saving...' : 'Save Settings'}
                  </button>
                  {adminStatus.success && <span className="status-badge status-badge--success">Saved ✓</span>}
                  {adminStatus.error && <span className="status-badge status-badge--error">{adminStatus.error}</span>}
                </div>
              </form>
            </section>
          )}

          {/* STUDENT TAB 2: JOB SEARCH */}
          {!isAdmin && activeTab === 'job-search' && (
            <section className="settings-section" id="section-job-search">
              <div className="settings-section__header">
                <h2 className="settings-section__title">Job search</h2>
                <p className="settings-section__desc">Configure target role, experience, and resume settings to tailor AI fit evaluation.</p>
              </div>

              <form onSubmit={handleSaveJobSearch} className="claude-rows-container">
                {/* Row 1: Target Role */}
                <div className="claude-row">
                  <div className="claude-row__info">
                    <label htmlFor="settings-target-role" className="claude-row__label">Target Role</label>
                    <p className="claude-row__desc">The primary job role or title you are applying for.</p>
                  </div>
                  <div className="claude-row__control">
                    <input
                      id="settings-target-role"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Senior Frontend Engineer"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                    />
                  </div>
                </div>

                {/* Row 2: Experience (Years + Experience Summary) */}
                <div className="claude-row claude-row--stacked">
                  <div className="claude-row__info">
                    <span className="claude-row__label">Experience</span>
                    <p className="claude-row__desc">
                      Roles, key skills and achievements. The assistant compares this with a job description to evaluate your fit.
                    </p>
                  </div>

                  <div className="experience-inputs-group">
                    <div className="years-input-wrapper">
                      <label htmlFor="settings-years-exp" className="sub-label">Years of Experience (0–60)</label>
                      <input
                        id="settings-years-exp"
                        type="number"
                        min="0"
                        max="60"
                        className="form-input years-input"
                        placeholder="e.g. 5"
                        value={yearsOfExperience}
                        onChange={(e) => setYearsOfExperience(e.target.value)}
                      />
                    </div>

                    <div className="summary-input-wrapper">
                      <label htmlFor="settings-exp-summary" className="sub-label">Experience Summary (max 3000 chars)</label>
                      <textarea
                        id="settings-exp-summary"
                        rows={4}
                        maxLength={3000}
                        className="form-textarea"
                        placeholder="Summarize your career history, key skills, major projects, and achievements..."
                        value={experienceSummary}
                        onChange={(e) => setExperienceSummary(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Row 3: Resume Component (3 states) */}
                <div className="claude-row claude-row--stacked">
                  <div className="claude-row__info">
                    <span className="claude-row__label">Master Resume</span>
                    <p className="claude-row__desc">
                      Your master resume text is analyzed alongside your experience summary for mock interviews and role-fit analysis.
                    </p>
                  </div>

                  {/* STATE (c): SAVED COMPACT SUMMARY ROW */}
                  {currentResumeState === 'saved' && (
                    <div className="saved-resume-compact-row">
                      <span className="saved-resume-text">
                        Resume added, {resumeText.length} characters stored.
                        {uploadedFileName ? ` (${uploadedFileName})` : ''}
                      </span>
                      <div className="saved-resume-actions">
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Replace
                        </button>
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          onClick={() => setResumeModeOverride('paste')}
                        >
                          Edit text
                        </button>
                        <button
                          type="button"
                          className="btn-danger-link btn-sm"
                          onClick={handleRemoveResume}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STATE (a): EMPTY UPLOAD DROPZONE */}
                  {currentResumeState === 'empty' && (
                    <div className="resume-empty-container">
                      <div
                        className={`resume-dropzone ${isDragging ? 'resume-dropzone--dragging' : ''}`}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDragging(false);
                          if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
                        }}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <span className="dropzone-icon">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                          </svg>
                        </span>
                        <span className="dropzone-text">
                          {isParsing ? 'Extracting text from file...' : 'Upload PDF, DOCX, or TXT file'}
                        </span>
                        <span className="dropzone-subtext">Click to browse or drag & drop file here</span>
                      </div>

                      <div className="resume-mode-switch">
                        <button
                          type="button"
                          className="btn-link"
                          onClick={() => setResumeModeOverride('paste')}
                        >
                          Paste text instead
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STATE (b): PASTE / EDIT TEXTAREA MODE */}
                  {currentResumeState === 'paste' && (
                    <div className="resume-paste-container">
                      <div className="claude-row__header-flex">
                        <span className="character-count">{resumeText.length} characters</span>
                      </div>

                      <textarea
                        id="settings-resume-text"
                        rows="8"
                        className="form-textarea"
                        placeholder="Paste resume text here..."
                        value={resumeText}
                        onChange={(e) => setResumeText(e.target.value)}
                      />

                      <div className="resume-mode-switch">
                        <button
                          type="button"
                          className="btn-link"
                          onClick={() => {
                            if (resumeText !== initialResumeText) {
                              if (!window.confirm('You have unsaved text changes. Switch to file upload dropzone?')) {
                                return;
                              }
                            }
                            setResumeModeOverride('upload');
                          }}
                        >
                          Upload a file instead
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Hidden file input for resume uploads */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.md"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                    }}
                  />
                </div>

                {/* Single Save Button for Job search tab */}
                <div className="settings-section__footer">
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={!isJobSearchDirty || jobSearchStatus.loading || isParsing}
                  >
                    {jobSearchStatus.loading ? 'Saving...' : 'Save Job search'}
                  </button>
                  {jobSearchStatus.success && <span className="status-badge status-badge--success">Saved ✓</span>}
                  {jobSearchStatus.error && <span className="status-badge status-badge--error">{jobSearchStatus.error}</span>}
                </div>
              </form>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
