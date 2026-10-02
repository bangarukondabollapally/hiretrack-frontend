import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { extractTextFromFile } from '../lib/fileParser';
import './ProfilePage.css';

const TABS = [
  { id: 'account', label: 'Account', icon: '👤' },
  { id: 'job-search', label: 'Job search', icon: '🎯' },
  { id: 'resume', label: 'Resume', icon: '📄' },
];

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active tab synchronized with URL ?tab= parameter
  const tabParam = searchParams.get('tab');
  const activeTab = TABS.some(t => t.id === tabParam) ? tabParam : 'account';

  const setActiveTab = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  // Profile data & initial state for change tracking (dirty check)
  const [name, setName] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [resumeText, setResumeText] = useState('');

  const [initialName, setInitialName] = useState('');
  const [initialTargetRole, setInitialTargetRole] = useState('');
  const [initialResumeText, setInitialResumeText] = useState('');

  // Resume UI mode: 'auto' | 'paste' | 'upload'
  const [resumeModeOverride, setResumeModeOverride] = useState(null); // 'paste' | 'upload' | null

  // Loading & status states
  const [isLoading, setIsLoading] = useState(true);
  const [isParsing, setIsParsing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');

  // Per-section status feedback
  const [accountStatus, setAccountStatus] = useState({ loading: false, success: false, error: '' });
  const [jobSearchStatus, setJobSearchStatus] = useState({ loading: false, success: false, error: '' });
  const [resumeStatus, setResumeStatus] = useState({ loading: false, success: false, error: '' });

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
      const fetchedResume = data.resumeText || '';

      setName(fetchedName);
      setInitialName(fetchedName);

      setTargetRole(fetchedRole);
      setInitialTargetRole(fetchedRole);

      setResumeText(fetchedResume);
      setInitialResumeText(fetchedResume);
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Section 1: Save Account
  const handleSaveAccount = async (e) => {
    e.preventDefault();
    setAccountStatus({ loading: true, success: false, error: '' });
    try {
      await axiosInstance.put('/api/profile', { name });
      setInitialName(name);
      setAccountStatus({ loading: false, success: true, error: '' });
      setTimeout(() => setAccountStatus(prev => ({ ...prev, success: false })), 3000);
    } catch (err) {
      setAccountStatus({ loading: false, success: false, error: 'Failed to save account details.' });
    }
  };

  // Section 2: Save Job Search
  const handleSaveJobSearch = async (e) => {
    e.preventDefault();
    setJobSearchStatus({ loading: true, success: false, error: '' });
    try {
      await axiosInstance.put('/api/profile', { targetRole });
      setInitialTargetRole(targetRole);
      setJobSearchStatus({ loading: false, success: true, error: '' });
      setTimeout(() => setJobSearchStatus(prev => ({ ...prev, success: false })), 3000);
    } catch (err) {
      setJobSearchStatus({ loading: false, success: false, error: 'Failed to save target role.' });
    }
  };

  // Section 3: Save Resume
  const handleSaveResume = async (e) => {
    if (e) e.preventDefault();
    setResumeStatus({ loading: true, success: false, error: '' });
    try {
      await axiosInstance.put('/api/profile', { resumeText });
      setInitialResumeText(resumeText);
      setResumeModeOverride(null);
      setResumeStatus({ loading: false, success: true, error: '' });
      setTimeout(() => setResumeStatus(prev => ({ ...prev, success: false })), 3000);
    } catch (err) {
      setResumeStatus({ loading: false, success: false, error: 'Failed to save resume.' });
    }
  };

  const handleRemoveResume = async () => {
    if (window.confirm('Are you sure you want to remove your stored master resume?')) {
      setResumeStatus({ loading: true, success: false, error: '' });
      try {
        await axiosInstance.put('/api/profile', { resumeText: '' });
        setResumeText('');
        setInitialResumeText('');
        setUploadedFileName('');
        setResumeModeOverride(null);
        setResumeStatus({ loading: false, success: true, error: '' });
        setTimeout(() => setResumeStatus(prev => ({ ...prev, success: false })), 3000);
      } catch (err) {
        setResumeStatus({ loading: false, success: false, error: 'Failed to remove resume.' });
      }
    }
  };

  const handleFileSelect = async (file) => {
    if (!file) return;
    setIsParsing(true);
    setResumeStatus({ loading: false, success: false, error: '' });

    try {
      const extractedText = await extractTextFromFile(file);
      if (!extractedText || !extractedText.trim()) {
        throw new Error('No readable text could be extracted from this file.');
      }
      setResumeText(extractedText);
      setUploadedFileName(file.name);
      setResumeModeOverride('paste'); // show textarea mode to view/edit extracted text
    } catch (err) {
      setResumeStatus({
        loading: false,
        success: false,
        error: err.message || 'Failed to parse file. Please try pasting text instead.',
      });
    } finally {
      setIsParsing(false);
    }
  };

  // Determine current effective resume state:
  // (a) 'empty': no resume text & mode is not 'paste'
  // (b) 'paste': user clicked paste text or editing
  // (c) 'saved': initial resume exists & mode is not forced to edit
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
  const isJobSearchDirty = targetRole !== initialTargetRole;
  const isResumeDirty = resumeText !== initialResumeText;

  if (isLoading) {
    return <div className="settings-loading">Loading settings...</div>;
  }

  return (
    <div className="settings-page">
      <header className="settings-header">
        <h1 className="settings-title">Settings</h1>
        <p className="settings-subtitle">Manage your account profile, job search target role, and master resume.</p>
      </header>

      <div className="settings-layout">
        {/* Desktop Left Nav Section List / Mobile Top Scrollable Segmented Tabs */}
        <nav className="settings-nav" aria-label="Settings sections">
          {TABS.map(tab => (
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

        {/* Content Pane: Renders ONLY the active section */}
        <div className="settings-content">
          {/* SECTION 1: ACCOUNT */}
          {activeTab === 'account' && (
            <section className="settings-section" id="section-account">
              <div className="settings-section__header">
                <h2 className="settings-section__title">Account</h2>
                <p className="settings-section__desc">Your personal details and authentication credentials.</p>
              </div>

              <form onSubmit={handleSaveAccount} className="claude-rows-container">
                {/* Row 1: Full Name */}
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

                {/* Row 2: Email */}
                <div className="claude-row">
                  <div className="claude-row__info">
                    <span className="claude-row__label">Email Address</span>
                    <p className="claude-row__desc">Your login email address (read-only).</p>
                  </div>
                  <div className="claude-row__control">
                    <span className="read-only-value">{user?.email || '—'}</span>
                  </div>
                </div>

                {/* Row 3: Sign Out */}
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

                {/* Section Action Footer */}
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

          {/* SECTION 2: JOB SEARCH */}
          {activeTab === 'job-search' && (
            <section className="settings-section" id="section-job-search">
              <div className="settings-section__header">
                <h2 className="settings-section__title">Job search</h2>
                <p className="settings-section__desc">Configure target role settings to tailor AI guidance.</p>
              </div>

              <form onSubmit={handleSaveJobSearch} className="claude-rows-container">
                <div className="claude-row">
                  <div className="claude-row__info">
                    <label htmlFor="settings-target-role" className="claude-row__label">Target Role</label>
                    <p className="claude-row__desc">The primary job role or title you are applying for (e.g. Senior Frontend Engineer).</p>
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

                <div className="settings-section__footer">
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={!isJobSearchDirty || jobSearchStatus.loading}
                  >
                    {jobSearchStatus.loading ? 'Saving...' : 'Save Job Search'}
                  </button>
                  {jobSearchStatus.success && <span className="status-badge status-badge--success">Saved ✓</span>}
                  {jobSearchStatus.error && <span className="status-badge status-badge--error">{jobSearchStatus.error}</span>}
                </div>
              </form>
            </section>
          )}

          {/* SECTION 3: RESUME (3 states, bi-directional movement) */}
          {activeTab === 'resume' && (
            <section className="settings-section" id="section-resume">
              <div className="settings-section__header">
                <h2 className="settings-section__title">Resume</h2>
                <p className="settings-section__desc">Your master resume text is analyzed by the AI Assistant for mock interviews and application advice.</p>
              </div>

              {resumeStatus.error && (
                <div className="status-badge status-badge--error status-badge--block">
                  {resumeStatus.error}
                </div>
              )}

              {/* STATE (c): SAVED COMPACT SUMMARY ROW */}
              {currentResumeState === 'saved' && (
                <div className="claude-rows-container">
                  <div className="claude-row">
                    <div className="claude-row__info">
                      <span className="claude-row__label">Master Resume</span>
                      <p className="claude-row__desc">
                        Resume added, {resumeText.length} characters stored.
                        {uploadedFileName ? ` (${uploadedFileName})` : ''}
                      </p>
                    </div>
                    <div className="claude-row__control claude-row__control--actions">
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
                    <span className="dropzone-icon">📥</span>
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
                <form onSubmit={handleSaveResume} className="resume-paste-container">
                  <div className="claude-row claude-row--stacked">
                    <div className="claude-row__header-flex">
                      <div>
                        <label htmlFor="settings-resume-text" className="claude-row__label">Resume Text</label>
                        <p className="claude-row__desc">Edit or paste your full plain-text resume below.</p>
                      </div>
                      <span className="character-count">{resumeText.length} characters</span>
                    </div>

                    <textarea
                      id="settings-resume-text"
                      rows="12"
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
                          if (isResumeDirty) {
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

                  <div className="settings-section__footer">
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={!isResumeDirty || resumeStatus.loading || isParsing}
                    >
                      {resumeStatus.loading ? 'Saving...' : 'Save Resume'}
                    </button>
                    {initialResumeText && (
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => {
                          setResumeText(initialResumeText);
                          setResumeModeOverride(null);
                        }}
                      >
                        Cancel
                      </button>
                    )}
                    {resumeStatus.success && <span className="status-badge status-badge--success">Saved ✓</span>}
                  </div>
                </form>
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
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
