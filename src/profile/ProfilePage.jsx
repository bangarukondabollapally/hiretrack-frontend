import { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import './ProfilePage.css';

export default function ProfilePage() {
  const [resumeText, setResumeText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.get('/api/profile');
      setResumeText(response.data.resumeText || '');
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load profile data.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage({ type: '', text: '' });

    try {
      await axiosInstance.put('/api/profile', { resumeText });
      setMessage({ type: 'success', text: 'Resume updated successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update resume.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="profile-loading">Loading profile...</div>;
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1 className="page-title">Profile & Resume</h1>
        <p className="profile-subtitle">
          Save your master resume text here. The AI Assistant uses this to tailor advice for your applications.
        </p>
      </div>

      {message.text && (
        <div className={`profile-alert profile-alert--${message.type}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="profile-form">
        <div className="form-group">
          <label className="form-label">Master Resume Text</label>
          <textarea
            rows="16"
            className="resume-textarea"
            placeholder="Paste your resume text here (experience, skills, education)..."
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
          />
        </div>

        <div className="form-actions">
          <button type="submit" disabled={isSaving} className="btn-primary">
            {isSaving ? 'Saving...' : 'Save Resume'}
          </button>
        </div>
      </form>
    </div>
  );
}
