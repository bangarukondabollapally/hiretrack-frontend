import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  useApplicationQuery,
  useApplicationsQuery,
  useOpeningsQuery,
  invalidateApplicationQueries,
  queryClient,
} from '../api/queries';
import OpeningPicker, { fieldsFromOpening } from './OpeningPicker';
import axiosInstance from '../api/axiosInstance';
import StatusControl from './StatusControl';
import TagSelector from './TagSelector';
import DeleteConfirmModal from './DeleteConfirmModal';
import DatePickerPopover from '../components/DatePickerPopover';
import InterviewTimeline from '../interviews/InterviewTimeline';
import './ApplicationForm.css';

export default function ApplicationForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const location = useLocation();

  const { user } = useAuth();
  const userId = user?.userId || user?.id || user?.email;

  const { data: applicationData, isLoading: isQueryLoading, refetch: refetchApp } = useApplicationQuery(userId, id);

  const prefillOpening = location.state?.opening;

  const EMPTY_FORM = {
    companyName: '',
    jobRole: '',
    status: 'APPLIED',
    jobType: 'Full-time',
    jobUrl: '',
    notes: '',
    appliedDate: new Date().toISOString().split('T')[0],
    followUpDate: '',
    jobDescription: '',
    placementOpeningId: null,
  };

  const [formData, setFormData] = useState(() =>
    prefillOpening?.id ? { ...EMPTY_FORM, ...fieldsFromOpening(prefillOpening) } : EMPTY_FORM
  );

  // New applications: pick an existing HireTrack opening (default) or enter an external one manually.
  const [source, setSource] = useState('opening');
  const [selectedOpening, setSelectedOpening] = useState(prefillOpening?.id ? prefillOpening : null);
  const isLinked = !isEdit && Boolean(formData.placementOpeningId);

  const { data: openings, isLoading: openingsLoading, isError: openingsError } = useOpeningsQuery(userId, false, { enabled: !isEdit });
  const { data: myApplications } = useApplicationsQuery(userId, { enabled: !isEdit });
  const appliedByOpening = new Map(
    (myApplications || []).filter((a) => a.placementOpeningId).map((a) => [a.placementOpeningId, a.id])
  );

  const selectOpening = (opening) => {
    setSelectedOpening(opening);
    setFormData((f) => ({ ...f, ...fieldsFromOpening(opening) }));
    setError('');
  };

  // Unlinking clears the auto-filled opening details but keeps status, dates and notes.
  const clearOpening = () => {
    setSelectedOpening(null);
    setFormData((f) => ({ ...f, companyName: '', jobRole: '', jobType: 'Full-time', jobUrl: '', jobDescription: '', placementOpeningId: null }));
  };

  const chooseSource = (next) => {
    if (next === source) return;
    if (selectedOpening || formData.placementOpeningId) clearOpening();
    setSource(next);
  };

  const [currentTags, setCurrentTags] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit && applicationData) {
      setFormData({
        companyName: applicationData.companyName || '',
        jobRole: applicationData.jobRole || '',
        status: applicationData.status || 'APPLIED',
        jobType: applicationData.jobType || 'Full-time',
        jobUrl: applicationData.jobUrl || '',
        notes: applicationData.notes || '',
        appliedDate: applicationData.appliedDate || '',
        followUpDate: applicationData.followUpDate || '',
        jobDescription: applicationData.jobDescription || ''
      });
      setCurrentTags(applicationData.tags || []);
    }
  }, [isEdit, applicationData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSaving(true);

    try {
      if (isEdit) {
        await axiosInstance.put(`/api/applications/${id}`, formData);
        invalidateApplicationQueries(userId);
        queryClient.invalidateQueries({ queryKey: ['applications', userId] });
        queryClient.invalidateQueries({ queryKey: ['application', userId, id] });
        queryClient.invalidateQueries({ queryKey: ['dashboard', userId] });
        queryClient.invalidateQueries({ queryKey: ['interviews', userId] });
        navigate('/applications');
      } else {
        await axiosInstance.post('/api/applications', formData);
        invalidateApplicationQueries(userId);
        queryClient.invalidateQueries({ queryKey: ['applications', userId] });
        queryClient.invalidateQueries({ queryKey: ['dashboard', userId] });
        navigate('/applications', { replace: true, state: { toastMessage: 'Application created successfully!' } });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save application.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      await axiosInstance.delete(`/api/applications/${id}`);
      invalidateApplicationQueries(userId);
      queryClient.invalidateQueries({ queryKey: ['applications', userId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', userId] });
      queryClient.invalidateQueries({ queryKey: ['interviews', userId] });
      setIsDeleteModalOpen(false);
      navigate('/applications', { state: { toastMessage: 'Application deleted permanently.' } });
    } catch (err) {
      console.error('Failed to delete application:', err);
      setError('Failed to delete application. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const isLoading = isEdit && isQueryLoading && !applicationData;

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
        {!isEdit && (
          <>
            <div className="application-source" role="group" aria-label="Application source">
              <button
                type="button"
                className="application-source__option"
                aria-pressed={source === 'opening'}
                onClick={() => chooseSource('opening')}
              >
                HireTrack opening
              </button>
              <button
                type="button"
                className="application-source__option"
                aria-pressed={source === 'manual'}
                onClick={() => chooseSource('manual')}
              >
                External application
              </button>
            </div>
            <p className="application-source__hint">
              {source === 'opening'
                ? 'Pick an opening from your placement cell — company, role and details are filled in and the application stays linked to it.'
                : 'For jobs not listed in HireTrack. Enter the details yourself.'}
            </p>
            {source === 'opening' && (
              <OpeningPicker
                openings={openings}
                isLoading={openingsLoading && !openings}
                isError={openingsError && !openings}
                appliedByOpening={appliedByOpening}
                selected={selectedOpening}
                onSelect={selectOpening}
                onClear={clearOpening}
              />
            )}
          </>
        )}

        <div className="form-grid">
          <div className="form-group">
            <label>Company Name {isEdit ? '(Read-only)' : '*'}</label>
            <input
              type="text"
              required
              disabled={isEdit || isLinked}
              placeholder="e.g. Google"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Job Role {isEdit ? '(Read-only)' : '*'}</label>
            <input
              type="text"
              required
              disabled={isEdit || isLinked}
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
            <label>Job Type {isEdit ? '(Read-only)' : ''}</label>
            <select
              value={formData.jobType}
              disabled={isEdit}
              onChange={(e) => setFormData({ ...formData, jobType: e.target.value })}
            >
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contract">Contract</option>
              <option value="Internship">Internship</option>
            </select>
          </div>

          <div className="form-group">
            <label>Applied Date {isEdit ? '(Read-only)' : ''}</label>
            <DatePickerPopover
              value={formData.appliedDate}
              disabled={isEdit}
              onChange={(val) => setFormData({ ...formData, appliedDate: val })}
              placeholder="Select applied date"
            />
          </div>

          <div className="form-group">
            <label>Follow-Up Date {isEdit ? '(Read-only)' : ''}</label>
            <DatePickerPopover
              value={formData.followUpDate}
              disabled={isEdit}
              onChange={(val) => setFormData({ ...formData, followUpDate: val })}
              placeholder="Select follow-up date"
            />
          </div>
        </div>

        <div className="form-group">
          <label>Job URL {isEdit ? '(Read-only)' : ''}</label>
          <input
            type="url"
            disabled={isEdit}
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

        <div className="form-group">
          <label>Job Description {isEdit ? '(Read-only)' : ''}</label>
          <textarea
            rows="5"
            disabled={isEdit}
            placeholder="Paste full job description text here..."
            value={formData.jobDescription}
            onChange={(e) => setFormData({ ...formData, jobDescription: e.target.value })}
          />
        </div>

        {isEdit && (
          <div className="form-section">
            <TagSelector
              applicationId={id}
              currentTags={currentTags}
              onTagsUpdated={() => {
                refetchApp();
                queryClient.invalidateQueries({ queryKey: ['applications', userId] });
              }}
            />
          </div>
        )}

        <div className="form-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {isEdit && (
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="btn-danger-outline"
              >
                Delete Application
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="button" onClick={() => navigate('/applications')} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isSaving || (!isEdit && source === 'opening' && !isLinked)} className="btn-primary">
              {isSaving ? 'Saving...' : isEdit ? 'Update Application' : 'Create Application'}
            </button>
          </div>
        </div>
      </form>

      {isEdit && (
        <div className="timeline-section">
          <InterviewTimeline applicationId={id} />
        </div>
      )}

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        title="Delete Application"
        message={`Are you sure you want to permanently delete your application for "${formData.jobRole}" at "${formData.companyName}"? All related interview rounds will also be deleted. Deletion is permanent.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setIsDeleteModalOpen(false)}
        isLoading={isDeleting}
      />
    </div>
  );
}
