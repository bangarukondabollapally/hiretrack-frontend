import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import InterviewTimeline from './InterviewTimeline';
import './InterviewsPage.css';

export default function InterviewsPage() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [selectedAppId, setSelectedAppId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.get('/api/applications');
      const apps = response.data || [];
      setApplications(apps);
      if (apps.length > 0) {
        setSelectedAppId(apps[0].id.toString());
      }
    } catch (err) {
      setError('Failed to load applications for interviews.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="interviews-loading">Loading interview schedules...</div>;
  }

  return (
    <div className="interviews-container">
      <div className="interviews-header">
        <h1 className="page-title">Interview Schedules</h1>
        <p className="interviews-subtitle">
          Track and manage your upcoming interview rounds across all job applications.
        </p>
      </div>

      {error && <div className="interviews-error">{error}</div>}

      {applications.length === 0 ? (
        <div className="interviews-empty">
          <p>No job applications found yet. Add an application first to schedule interviews.</p>
          <button onClick={() => navigate('/applications/new')} className="btn-primary">
            + Add Application
          </button>
        </div>
      ) : (
        <div className="interviews-content">
          <div className="app-selector-card">
            <label className="selector-label" htmlFor="app-select">
              Select Target Application:
            </label>
            <select
              id="app-select"
              className="app-select-dropdown"
              value={selectedAppId}
              onChange={(e) => setSelectedAppId(e.target.value)}
            >
              {applications.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.companyName} — {app.jobRole} ({app.status})
                </option>
              ))}
            </select>
          </div>

          {selectedAppId && (
            <div className="interview-timeline-wrapper">
              <InterviewTimeline applicationId={selectedAppId} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
