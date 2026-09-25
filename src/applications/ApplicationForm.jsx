import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import StatusControl from './StatusControl';
import TagSelector from './TagSelector';
import InterviewTimeline from '../interviews/InterviewTimeline';
import './ApplicationForm.css';

export default function ApplicationForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    companyName: '',
    jobRole: '',
    status: 'APPLIED',
    jobType: 'Full-time',
    jobUrl: '',
    notes: '',
    appliedDate: new Date().toISOString().split('T')[0],
    followUpDate: '',
    jobDescription: ''
  });

  const [currentTags, setCurrentTags] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit) {
      fetchApplication();
    }
  }, [id]);

  const fetchApplication = async () => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.get(`/api/applications/${id}`);
      const data = response.data;
      setFormData({
        companyName: data.companyName || '',
        jobRole: data.jobRole || '',
        status: data.status || 'APPLIED',
        jobType: data.jobType || 'Full-time',
        jobUrl: data.jobUrl || '',
        notes: data.notes || '',
        appliedDate: data.appliedDate || '',
        followUpDate: data.followUpDate || '',
        jobDescription: data.jobDescription || ''
      });
      setCurrentTags(data.tags || []);
    } catch (err) {
      setError('Failed to load application details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSaving(true);

    try {
      if (isEdit) {
        await axiosInstance.put(`/api/applications/${id}`, formData);
      } else {
        const response = await axiosInstance.post('/api/applications', formData);
        const newApp = response.data;
        navigate(`/applications/${newApp.id}`);
        return;
      }
      navigate('/applications');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save application.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="form-loading">Loading application...</div>;
  }

  return (
    <div className="application-form-container">
      <div className="form-header">
        <h2>{isEdit ? 'Edit Application' : 'New Job Application'}</h2>
        <button type="button" onClick={() => navigate('/applications')} className="btn-secondary">
          Back to List
        </button>
      </div>

      {error && <div className="form-error-alert">{error}</div>}

      <form onSubmit={handleSubmit} className="application-form">
        <div className="form-grid">
          <div className="form-group">
            <label>Company Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Google"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Job Role *</label>
            <input
              type="text"
              required
              placeholder="e.g. Frontend Engineer"
              value={formData.jobRole}
              onChange={(e) => setFormData({ ...formData, jobRole: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Status *</label>
            <StatusControl
              value={formData.status}
              onChange={(status) => setFormData({ ...formData, status })}
            />
          </div>

          <div className="form-group">
            <label>Job Type</label>
            <select
              value={formData.jobType}
              onChange={(e) => setFormData({ ...formData, jobType: e.target.value })}
            >
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contract">Contract</option>
              <option value="Internship">Internship</option>
            </select>
          </div>

          <div className="form-group">
            <label>Applied Date</label>
            <input
              type="date"
              value={formData.appliedDate}
              onChange={(e) => setFormData({ ...formData, appliedDate: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Follow-Up Date</label>
            <input
              type="date"
              value={formData.followUpDate}
              onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Job URL</label>
          <input
            type="url"
            placeholder="https://careers.google.com/jobs/..."
            value={formData.jobUrl}
            onChange={(e) => setFormData({ ...formData, jobUrl: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Notes</label>
          <textarea
            rows="3"
            placeholder="Referral name, recruiter contact, salary range..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>

        {isEdit && (
          <div className="form-section">
            <TagSelector
              applicationId={id}
              currentTags={currentTags}
              onTagsUpdated={fetchApplication}
            />
          </div>
        )}

        <div className="form-actions">
          <button type="button" onClick={() => navigate('/applications')} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={isSaving} className="btn-primary">
            {isSaving ? 'Saving...' : isEdit ? 'Update Application' : 'Create Application'}
          </button>
        </div>
      </form>

      {isEdit && (
        <div className="timeline-section">
          <InterviewTimeline applicationId={id} />
        </div>
      )}
    </div>
  );
}
