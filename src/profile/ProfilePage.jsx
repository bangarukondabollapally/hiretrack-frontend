import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../auth/AuthContext';
import { useProfileQuery, invalidateProfileQueries } from '../api/queries';
import axiosInstance from '../api/axiosInstance';
import { extractTextFromFile } from '../lib/fileParser';
import QueryStateNotice from '../components/QueryStateNotice';
import { AVATAR_PRESETS, renderAvatarSvg } from '../lib/avatarPresets';
import Avatar from '../components/Avatar';
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
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
        <line x1="11" y1="8" x2="11" y2="14" />
        <line x1="8" y1="11" x2="14" y2="11" />
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
  const userId = user?.userId || user?.id || user?.email;
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    data: profileData,
    isLoading: isProfileLoading,
    isFetching,
    isError,
    error: profileErr,
    refetch,
  } = useProfileQuery(userId);

  const isLoading = isProfileLoading && !profileData;
  const isFromCache = !isProfileLoading && !!profileData;

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
  const [avatarPreset, setAvatarPreset] = useState(null);
  const [avatarDataUrl, setAvatarDataUrl] = useState(null);
  const [targetRole, setTargetRole] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [experienceSummary, setExperienceSummary] = useState('');
  const [resumeText, setResumeText] = useState('');

  const [initialName, setInitialName] = useState('');
  const [initialAvatarPreset, setInitialAvatarPreset] = useState(null);
  const [initialAvatarDataUrl, setInitialAvatarDataUrl] = useState(null);
  const [initialTargetRole, setInitialTargetRole] = useState('');
  const [initialYearsOfExperience, setInitialYearsOfExperience] = useState('');
  const [initialExperienceSummary, setInitialExperienceSummary] = useState('');
  const [initialResumeText, setInitialResumeText] = useState('');
  const [isProcessingAvatar, setIsProcessingAvatar] = useState(false);
  const avatarFileInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Admin Placement Office settings
  const [institutionName, setInstitutionName] = useState(() => {
    try {
      const saved = sessionStorage.getItem('ht_admin_settings');
      return saved ? JSON.parse(saved).institutionName : 'Campus Placement Cell';
    } catch { return 'Campus Placement Cell'; }
  });
  const [adminContactEmail, setAdminContactEmail] = useState(() => {
    try {
      const saved = sessionStorage.getItem('ht_admin_settings');
      return saved ? JSON.parse(saved).contactEmail : user?.email || 'placements@univ.edu';
    } catch { return user?.email || 'placements@univ.edu'; }
  });
  const [defaultCurrency, setDefaultCurrency] = useState(() => {
    try {
      const saved = sessionStorage.getItem('ht_admin_settings');
      return saved ? JSON.parse(saved).defaultCurrency : 'INR (₹)';
    } catch { return 'INR (₹)'; }
  });
  const [adminNotify, _setAdminNotify] = useState(() => {
    try {
      const saved = sessionStorage.getItem('ht_admin_settings');
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
  const [isParsing, setIsParsing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');

  // Per-tab status feedback
  const [accountStatus, setAccountStatus] = useState({ loading: false, success: false, error: '' });
  const [jobSearchStatus, setJobSearchStatus] = useState({ loading: false, success: false, error: '' });

  useEffect(() => {
    if (profileData) {
      const data = profileData || {};
      const fetchedName = data.name || '';
      const fetchedAvatar = data.avatarPreset || null;
      const fetchedDataUrl = data.avatarDataUrl || null;
      const fetchedRole = data.targetRole || '';
      const fetchedYears = data.yearsOfExperience !== null && data.yearsOfExperience !== undefined ? String(data.yearsOfExperience) : '';
      const fetchedSummary = data.experienceSummary || '';
      const fetchedResume = data.resumeText || '';

      setName(fetchedName);
      setInitialName(fetchedName);

      setAvatarPreset(fetchedAvatar);
      setInitialAvatarPreset(fetchedAvatar);

      setAvatarDataUrl(fetchedDataUrl);
      setInitialAvatarDataUrl(fetchedDataUrl);

      setTargetRole(fetchedRole);
      setInitialTargetRole(fetchedRole);

      setYearsOfExperience(fetchedYears);
      setInitialYearsOfExperience(fetchedYears);

      setExperienceSummary(fetchedSummary);
      setInitialExperienceSummary(fetchedSummary);

      setResumeText(fetchedResume);
      setInitialResumeText(fetchedResume);
    }
  }, [profileData]);

  const processAvatarImage = (file) => {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error('No file provided.'));
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        return reject(new Error('Invalid image format. Allowed formats: JPEG, PNG, WebP.'));
      }
      if (file.size > 2 * 1024 * 1024) {
        return reject(new Error('Image size must be ≤ 2 MB.'));
      }

      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read image file.'));
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => reject(new Error('Failed to load image.'));
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 256;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve(dataUrl);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingAvatar(true);
    setAccountStatus({ loading: false, success: false, error: '' });

    try {
      const resizedDataUrl = await processAvatarImage(file);
      setAvatarDataUrl(resizedDataUrl);
    } catch (err) {
      setAccountStatus({ loading: false, success: false, error: err.message || 'Failed to process profile image.' });
    } finally {
      setIsProcessingAvatar(false);
      e.target.value = '';
    }
  };

  // Save Account tab
  const handleSaveAccount = async (e) => {
    e.preventDefault();
    setAccountStatus({ loading: true, success: false, error: '' });
    try {
      const res = await axiosInstance.put('/api/profile', { name, avatarPreset, avatarDataUrl });
      const updatedName = res.data?.name || name;
      const updatedAvatar = res.data?.avatarPreset !== undefined ? res.data?.avatarPreset : avatarPreset;
      const updatedDataUrl = res.data?.avatarDataUrl !== undefined ? res.data?.avatarDataUrl : avatarDataUrl;

      setName(updatedName);
      setInitialName(updatedName);
      setAvatarPreset(updatedAvatar);
      setInitialAvatarPreset(updatedAvatar);
      setAvatarDataUrl(updatedDataUrl);
      setInitialAvatarDataUrl(updatedDataUrl);

      invalidateProfileQueries(userId);
      setAccountStatus({ loading: false, success: true, error: '' });
      setTimeout(() => setAccountStatus(prev => ({ ...prev, success: false })), 3000);
    } catch (_err) {
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

      setName(data.name || name);
      setTargetRole(newRole);
      setInitialTargetRole(newRole);

      setYearsOfExperience(newYears);
      setInitialYearsOfExperience(newYears);

      setExperienceSummary(newSummary);
      setInitialExperienceSummary(newSummary);

      setResumeText(newResume);
      setInitialResumeText(newResume);

      setResumeModeOverride(null);
      invalidateProfileQueries(userId);
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
      sessionStorage.setItem('ht_admin_settings', JSON.stringify({
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
    } catch (_err) {
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
        invalidateProfileQueries(userId);
        setJobSearchStatus({ loading: false, success: true, error: '' });
        setTimeout(() => setJobSearchStatus(prev => ({ ...prev, success: false })), 3000);
      } catch (_err) {
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

  const isAccountDirty = name !== initialName || avatarPreset !== initialAvatarPreset || avatarDataUrl !== initialAvatarDataUrl;
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
      <QueryStateNotice
        isFetching={isFetching && !isLoading}
        isError={isError && !!profileData}
        error={profileErr}
        refetch={refetch}
      />

      <header className="settings-header">
        <h1 className="settings-title">Settings</h1>
        <p className="settings-subtitle">
          {isAdmin
            ? 'Manage administrator account preferences and placement office details.'
            : 'Manage your account profile, job search experience, and master resume.'}
        </p>
      </header>

      {/* User Header Profile Card */}
      <motion.div
        className="profile-user-card"
        initial={isFromCache ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className="profile-avatar">
          <Avatar
            avatarDataUrl={avatarDataUrl}
            avatarPreset={avatarPreset}
            size={44}
          />
        </div>
        <div className="profile-user-info">
          <span className="profile-user-name">{name.trim() || 'Add your name'}</span>
          <span className="profile-user-email">{user?.email}</span>
        </div>
        {isAdmin && (
          <div style={{ marginLeft: 'auto' }}>
            <span className="admin-role-badge">Admin</span>
          </div>
        )}
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
                <p className="settings-section__desc">Your avatar, name and sign-in details.</p>
              </div>

              <form onSubmit={handleSaveAccount} className="claude-rows-container">
                <div className="claude-row claude-row--stacked">
                  <div className="claude-row__info">
                    <label className="claude-row__label">Profile Picture Avatar</label>
                    <p className="claude-row__desc">Upload a photo (JPEG/PNG/WebP ≤2MB) or pick a preset avatar.</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        disabled={isProcessingAvatar}
                        onClick={() => avatarFileInputRef.current?.click()}
                      >
                        {isProcessingAvatar ? 'Processing...' : 'Upload photo'}
                      </button>
                      {avatarDataUrl && (
                        <button
                          type="button"
                          className="btn-danger-link btn-sm"
                          onClick={() => {
                            setAvatarDataUrl(null);
                          }}
                        >
                          Remove photo
                        </button>
                      )}
                      <input
                        ref={avatarFileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        style={{ display: 'none' }}
                        onChange={handleAvatarFileChange}
                      />
                    </div>

                    <div className="avatar-picker-grid">
                      <button
                        type="button"
                        className={`avatar-picker-item ${avatarPreset === null && !avatarDataUrl ? 'avatar-picker-item--active' : ''}`}
                        onClick={() => {
                          setAvatarPreset(null);
                        }}
                        title="Default profile avatar"
                        aria-label="Default profile avatar"
                      >
                        <Avatar avatarPreset={null} avatarDataUrl={null} size={36} />
                      </button>
                      {AVATAR_PRESETS.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className={`avatar-picker-item ${avatarPreset === p.id && !avatarDataUrl ? 'avatar-picker-item--active' : ''}`}
                          onClick={() => {
                            setAvatarPreset(p.id);
                          }}
                          title={p.label}
                          aria-label={p.label}
                        >
                          {renderAvatarSvg(p.id, userInitial, 36)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="claude-row">
                  <div className="claude-row__info">
                    <label htmlFor="settings-name" className="claude-row__label">{isAdmin ? 'Institute / placement cell name' : 'Full name'}</label>
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
                    <span className="claude-row__label">Email address</span>
                  </div>
                  <div className="claude-row__control">
                    <span className="read-only-value">{user?.email || '—'}</span>
                  </div>
                </div>

                <div className="claude-row">
                  <div className="claude-row__info">
                    <span className="claude-row__label">Session</span>
                  </div>
                  <div className="claude-row__control">
                    <button type="button" onClick={logout} className="btn-secondary btn-danger-outline">
                      Sign out
                    </button>
                  </div>
                </div>

                <div className="settings-section__footer">
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={!isAccountDirty || accountStatus.loading}
                  >
                    {accountStatus.loading ? 'Saving...' : 'Save changes'}
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
                <h2 className="settings-section__title">Placement office</h2>
                <p className="settings-section__desc">Configure institution details, contact information, and default opening preferences.</p>
              </div>

              <form onSubmit={handleSaveAdminSettings} className="claude-rows-container">
                <div className="claude-row">
                  <div className="claude-row__info">
                    <label htmlFor="settings-institution" className="claude-row__label">Institution / office name</label>
                    <p className="claude-row__desc">Name of your university placement cell or career services office.</p>
                  </div>
                  <div className="claude-row__control">
                    <input
                      id="settings-institution"
                      type="text"
                      className="form-input"
                      placeholder="e.g. University Placement Cell"
                      value={institutionName}
                      onChange={(e) => setInstitutionName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="claude-row">
                  <div className="claude-row__info">
                    <label htmlFor="settings-admin-email" className="claude-row__label">Placement contact email</label>
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
                    <label htmlFor="settings-default-currency" className="claude-row__label">Default opening currency</label>
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

                <div className="settings-section__footer">
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={!isAdminDirty || adminStatus.loading}
                  >
                    {adminStatus.loading ? 'Saving...' : 'Save changes'}
                  </button>
                  {adminStatus.success && <span className="status-badge status-badge--success">Saved</span>}
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
                <p className="settings-section__desc">Tell HireTrack what you're aiming for so the assistant can judge your fit for a role.</p>
              </div>

              <form onSubmit={handleSaveJobSearch} className="claude-rows-container">
                {/* Row 1: Target Role */}
                <div className="claude-row">
                  <div className="claude-row__info">
                    <label htmlFor="settings-target-role" className="claude-row__label">Target role</label>
                    <p className="claude-row__desc">The primary job role or title you are applying for.</p>
                  </div>
                  <div className="claude-row__control">
                    <input
                      id="settings-target-role"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Frontend Engineer"
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
                      Roles, key skills and achievements. Use 0 if you're a fresher.
                    </p>
                  </div>

                  <div className="experience-inputs-group">
                    <div className="years-input-wrapper">
                      <label htmlFor="settings-years-exp" className="sub-label">Years of experience (0–60)</label>
                      <input
                        id="settings-years-exp"
                        type="number"
                        min="0"
                        max="60"
                        className="form-input years-input"
                        placeholder="e.g. 0"
                        value={yearsOfExperience}
                        onChange={(e) => setYearsOfExperience(e.target.value)}
                      />
                    </div>

                    <div className="summary-input-wrapper">
                      <label htmlFor="settings-exp-summary" className="sub-label">Experience summary (max 3000 chars)</label>
                      <textarea
                        id="settings-exp-summary"
                        rows={4}
                        maxLength={3000}
                        className="form-textarea"
                        placeholder="Summarize your history, key skills, major projects, and achievements..."
                        value={experienceSummary}
                        onChange={(e) => setExperienceSummary(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Row 3: Resume Component (3 states) */}
                <div className="claude-row claude-row--stacked">
                  <div className="claude-row__info">
                    <span className="claude-row__label">Master resume</span>
                    <p className="claude-row__desc">
                      Used by the assistant for interview prep and role-fit checks. Files are read in your browser; only the text is saved.
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
                    {jobSearchStatus.loading ? 'Saving...' : 'Save changes'}
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
