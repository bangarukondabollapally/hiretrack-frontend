import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { extractTextFromFile } from '../lib/fileParser';
import './ProfilePage.css';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  
  const [activeTab, setActiveTab] = useState('account'); // 'account' | 'jobsearch' | 'resume'

  // Form states
  const [name, setName] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [resumeText, setResumeText] = useState('');

  // UI states
  const [isLoading, setIsLoading] = useState(true);
  const [showTextArea, setShowTextArea] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');

  // Per-section status: { loading: boolean, success: boolean, error: string }
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
      setName(response.data.name || '');
      setTargetRole(response.data.targetRole || '');
      setResumeText(response.data.resumeText || '');
    } catch (err) {
      console.error(err);
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
      setAccountStatus({ loading: false, success: true, error: '' });
      setTimeout(() => setAccountStatus((prev) => ({ ...prev, success: false })), 3000);
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
      setJobSearchStatus({ loading: false, success: true, error: '' });
      setTimeout(() => setJobSearchStatus((prev) => ({ ...prev, success: false })), 3000);
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
      setResumeStatus({ loading: false, success: true, error: '' });
      setTimeout(() => setResumeStatus((prev) => ({ ...prev, success: false })), 3000);
    } catch (err) {
      setResumeStatus({ loading: false, success: false, error: 'Failed to save resume.' });
    }
  };

  const handleRemoveResume = async () => {
    if (window.confirm('Are you sure you want to remove your stored resume?')) {
      setResumeText('');
      setUploadedFileName('');
      setShowTextArea(false);
      setResumeStatus({ loading: true, success: false, error: '' });
      try {
        await axiosInstance.put('/api/profile', { resumeText: '' });
        setResumeStatus({ loading: false, success: true, error: '' });
        setTimeout(() => setResumeStatus((prev) => ({ ...prev, success: false })), 3000);
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
      if (!extractedText) {
        throw new Error('No readable text could be extracted from this file.');
      }
      setResumeText(extractedText);
      setUploadedFileName(file.name);
      setShowTextArea(true);
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

  if (isLoading) {
    return <div className="settings-loading">Loading settings...</div>;
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1 className="settings-title">Settings</h1>
        <p className="settings-subtitle">Manage your account credentials, job search targets, and master resume.</p>
      </div>

      <div className="settings-layout">
        {/* Desktop Left Nav Tabs / Mobile Top Tabs */}
        <div className="settings-nav">
          <button
            type="button"
            className={`settings-nav__item ${activeTab === 'account' ? 'settings-nav__item--active' : ''}`}
            onClick={() => setActiveTab('account')}
          >
            Account
          </button>
          <button
            type="button"
            className={`settings-nav__item ${activeTab === 'jobsearch' ? 'settings-nav__item--active' : ''}`}
            onClick={() => setActiveTab('jobsearch')}
          >
            Job search
          </button>
          <button
            type="button"
            className={`settings-nav__item ${activeTab === 'resume' ? 'settings-nav__item--active' : ''}`}
            onClick={() => setActiveTab('resume')}
          >
            Resume {resumeText ? '✓' : '(optional)'}
          </button>
        </div>

        {/* Content Area */}
        <div className="settings-content">
          {/* Section 1: Account */}
          {(activeTab === 'account' || window.innerWidth < 768) && (
            <section className="settings-section" id="section-account">
              <div className="settings-section__header">
                <h2 className="settings-section__title">Account</h2>
                <p className="settings-section__desc">Personal details and login account.</p>
              </div>

              <form onSubmit={handleSaveAccount} className="settings-form">
                <div className="form-group">
                  <label htmlFor="settings-name" className="form-label">Full Name</label>
                  <input
                    id="settings-name"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Jane Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="settings-email" className="form-label">Email Address</label>
                  <input
                    id="settings-email"
                    type="email"
                    className="form-input form-input--disabled"
                    value={user?.email || ''}
                    readOnly
                    disabled
                  />
                  <span className="field-hint">Email address cannot be changed.</span>
                </div>

                <div className="settings-section__actions">
                  <button type="submit" className="btn-primary" disabled={accountStatus.loading}>
                    {accountStatus.loading ? 'Saving...' : 'Save Account'}
                  </button>
                  <button type="button" onClick={logout} className="btn-secondary btn-danger-outline">
                    Sign out
                  </button>
                  {accountStatus.success && <span className="status-badge status-badge--success">Saved ✓</span>}
                  {accountStatus.error && <span className="status-badge status-badge--error">{accountStatus.error}</span>}
                </div>
              </form>
            </section>
          )}

          {/* Section 2: Job search */}
          {(activeTab === 'jobsearch' || window.innerWidth < 768) && (
            <section className="settings-section" id="section-jobsearch">
              <div className="settings-section__header">
                <h2 className="settings-section__title">Job search</h2>
                <p className="settings-section__desc">Specify your target role for tailored AI guidance.</p>
              </div>

              <form onSubmit={handleSaveJobSearch} className="settings-form">
                <div className="form-group">
                  <label htmlFor="settings-target-role" className="form-label">Target Role</label>
                  <input
                    id="settings-target-role"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Senior Frontend Engineer"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                  />
                  <span className="field-hint">Used by the AI assistant to focus answers on your target domain.</span>
                </div>

                <div className="settings-section__actions">
                  <button type="submit" className="btn-primary" disabled={jobSearchStatus.loading}>
                    {jobSearchStatus.loading ? 'Saving...' : 'Save Job Search'}
                  </button>
                  {jobSearchStatus.success && <span className="status-badge status-badge--success">Saved ✓</span>}
                  {jobSearchStatus.error && <span className="status-badge status-badge--error">{jobSearchStatus.error}</span>}
                </div>
              </form>
            </section>
          )}

          {/* Section 3: Resume */}
          {(activeTab === 'resume' || window.innerWidth < 768) && (
            <section className="settings-section" id="section-resume">
              <div className="settings-section__header">
                <h2 className="settings-section__title">Resume <span className="title-optional">(optional)</span></h2>
                <p className="settings-section__desc">Your master resume text is used by the AI Assistant to customize interview responses.</p>
              </div>

              {resumeStatus.error && (
                <div className="status-badge status-badge--error status-badge--block">
                  {resumeStatus.error}
                </div>
              )}

              {/* Added state: Compact summary row */}
              {resumeText && !showTextArea ? (
                <div className="resume-compact-row">
                  <div className="resume-compact-info">
                    <span className="resume-compact-icon">📄</span>
                    <div className="resume-compact-details">
                      <span className="resume-compact-title">Master Resume Added</span>
                      <span className="resume-compact-meta">
                        {uploadedFileName ? `${uploadedFileName} • ` : ''}{resumeText.length} characters
                      </span>
                    </div>
                  </div>
                  <div className="resume-compact-actions">
                    <button
                      type="button"
                      className="btn-sm btn-secondary"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      className="btn-sm btn-secondary"
                      onClick={() => setShowTextArea(true)}
                    >
                      Edit text
                    </button>
                    <button
                      type="button"
                      className="btn-sm btn-danger-link"
                      onClick={handleRemoveResume}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                /* Empty state or editing state */
                <div className="resume-editor-area">
                  {!resumeText && !showTextArea ? (
                    <div className="resume-empty-box">
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
                          {isParsing ? 'Extracting text...' : 'Upload PDF, DOCX, or TXT file'}
                        </span>
                        <span className="dropzone-subtext">or drag and drop here</span>
                      </div>
                      <button
                        type="button"
                        className="paste-text-link"
                        onClick={() => setShowTextArea(true)}
                      >
                        or paste text instead
                      </button>
                    </div>
                  ) : (
                    /* Textarea active */
                    <div className="resume-textarea-container">
                      <div className="textarea-header">
                        <span className="textarea-label">Master Resume Text</span>
                        <span className="character-count">{resumeText.length} characters</span>
                      </div>
                      <textarea
                        rows="12"
                        className="form-textarea"
                        placeholder="Paste your master resume text here..."
                        value={resumeText}
                        onChange={(e) => setResumeText(e.target.value)}
                      />
                      {resumeText && (
                        <div className="textarea-footer-actions">
                          <button
                            type="button"
                            className="btn-sm btn-secondary"
                            onClick={() => setShowTextArea(false)}
                          >
                            Collapse preview
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="settings-section__actions">
                    <button
                      type="button"
                      onClick={handleSaveResume}
                      className="btn-primary"
                      disabled={resumeStatus.loading || isParsing}
                    >
                      {resumeStatus.loading ? 'Saving...' : 'Save Resume'}
                    </button>
                    {resumeStatus.success && <span className="status-badge status-badge--success">Saved ✓</span>}
                  </div>
                </div>
              )}

              {/* Hidden file input for file pickers */}
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
