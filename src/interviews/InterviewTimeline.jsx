import { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import './InterviewTimeline.css';

export default function InterviewTimeline({ applicationId, readOnly = false }) {
  const [interviews, setInterviews] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    round: '',
    interviewDate: '',
    interviewType: 'Video',
    outcome: 'PENDING',
    notes: ''
  });

  useEffect(() => {
    if (applicationId) {
      fetchInterviews();
    }
  }, [applicationId]);

  const fetchInterviews = async () => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.get(`/api/applications/${applicationId}/interviews`);
      setInterviews(response.data);
    } catch (err) {
      console.error('Failed to load interviews:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateInterview = async (e) => {
    e.preventDefault();
    if (!formData.round || !formData.interviewDate) return;

    try {
      await axiosInstance.post(`/api/applications/${applicationId}/interviews`, formData);
      setFormData({ round: '', interviewDate: '', interviewType: 'Video', outcome: 'PENDING', notes: '' });
      setIsAdding(false);
      fetchInterviews();
    } catch (err) {
      console.error('Failed to create interview round:', err);
    }
  };

  const handleDeleteInterview = async (interviewId) => {
    try {
      await axiosInstance.delete(`/api/applications/${applicationId}/interviews/${interviewId}`);
      fetchInterviews();
    } catch (err) {
      console.error('Failed to delete interview round:', err);
    }
  };

  return (
    <div className="interview-timeline">
      <div className="interview-timeline__header">
        <h4 className="interview-timeline__title">Interview Timeline</h4>
        {!readOnly && !isAdding && (
          <button onClick={() => setIsAdding(true)} className="interview-timeline__add-btn">
            + Add Round
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleCreateInterview} className="interview-timeline__form">
          <div className="form-group">
            <label>Round Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Technical Screen, System Design"
              value={formData.round}
              onChange={(e) => setFormData({ ...formData, round: e.target.value })}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Date & Time *</label>
              <input
                type="datetime-local"
                required
                value={formData.interviewDate}
                onChange={(e) => setFormData({ ...formData, interviewDate: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Type</label>
              <input
                type="text"
                placeholder="Video, Phone, Onsite"
                value={formData.interviewType}
                onChange={(e) => setFormData({ ...formData, interviewType: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Outcome</label>
            <select
              value={formData.outcome}
              onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
            >
              <option value="PENDING">Pending</option>
              <option value="PASSED">Passed</option>
              <option value="FAILED">Failed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea
              rows="2"
              placeholder="Preparation notes or feedback..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="interview-timeline__form-actions">
            <button type="button" onClick={() => setIsAdding(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save Round
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="interview-timeline__empty">Loading interviews...</p>
      ) : interviews.length === 0 ? (
        <p className="interview-timeline__empty">No interview rounds scheduled yet.</p>
      ) : (
        <div className="timeline-list">
          {interviews.map((item) => (
            <div key={item.id} className="timeline-item">
              <div className="timeline-item__badge">{item.outcome}</div>
              <div className="timeline-item__content">
                <div className="timeline-item__top">
                  <span className="timeline-item__round">{item.round}</span>
                  <span className="timeline-item__date">
                    {new Date(item.interviewDate).toLocaleString()}
                  </span>
                </div>
                <div className="timeline-item__meta">Type: {item.interviewType || 'N/A'}</div>
                {item.notes && <p className="timeline-item__notes">{item.notes}</p>}
              </div>
              {!readOnly && (
                <button
                  onClick={() => handleDeleteInterview(item.id)}
                  className="timeline-item__delete-btn"
                  title="Delete round"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
