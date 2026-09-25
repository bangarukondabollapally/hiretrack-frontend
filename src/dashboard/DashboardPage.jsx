import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import './DashboardPage.css';

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.get('/api/dashboard');
      setDashboardData(response.data);
    } catch (err) {
      setError('Failed to load dashboard metrics.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="dashboard-loading">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="dashboard-error">{error}</div>;
  }

  const { statusCounts = {}, upcomingInterviews = [], followUpsDue = [] } = dashboardData || {};

  return (
    <div className="dashboard-container">
      {/* 1. Greeting + primary action per DESIGN.md §7 */}
      <div className="dashboard-hero">
        <div className="dashboard-hero__content">
          <h1 className="dashboard-title">Welcome back</h1>
          <p className="dashboard-subtitle">Here is an overview of your active job search activities.</p>
        </div>
        <button onClick={() => navigate('/applications/new')} className="btn-primary">
          + Add application
        </button>
      </div>

      {/* 2. Metrics — integrated inline per DESIGN.md §7 */}
      <div className="dashboard-inline-metrics">
        <div className="inline-metric">
          <span className="inline-metric__value">{statusCounts.APPLIED || 0}</span>
          <span className="inline-metric__label">Applied</span>
        </div>
        <div className="inline-metric">
          <span className="inline-metric__value">{statusCounts.SCREENING || 0}</span>
          <span className="inline-metric__label">Screening</span>
        </div>
        <div className="inline-metric">
          <span className="inline-metric__value">{statusCounts.INTERVIEW || 0}</span>
          <span className="inline-metric__label">Interview</span>
        </div>
        <div className="inline-metric">
          <span className="inline-metric__value">{statusCounts.OFFER || 0}</span>
          <span className="inline-metric__label">Offer</span>
        </div>
        <div className="inline-metric">
          <span className="inline-metric__value">{statusCounts.REJECTED || 0}</span>
          <span className="inline-metric__label">Rejected</span>
        </div>
      </div>

      {/* 3. Main working area — two columns on desktop */}
      <div className="dashboard-grid">
        {/* Left column: Upcoming Interviews */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2 className="section-title">Upcoming Interviews</h2>
          </div>
          {upcomingInterviews.length === 0 ? (
            <p className="section-empty">No upcoming interviews scheduled for the next 7 days.</p>
          ) : (
            <div className="section-list">
              {upcomingInterviews.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => navigate(`/applications/${item.applicationId}`)}
                  className="section-row"
                >
                  <div className="section-row__main">
                    <span className="section-row__title">{item.companyName}</span>
                    <span className="section-row__meta">
                      {new Date(item.interviewDate).toLocaleString()}
                    </span>
                  </div>
                  <span className="section-row__action">View →</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column: Follow-ups Due */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2 className="section-title">Follow-ups Due</h2>
          </div>
          {followUpsDue.length === 0 ? (
            <p className="section-empty">No follow-ups due today.</p>
          ) : (
            <div className="section-list">
              {followUpsDue.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => navigate(`/applications/${item.applicationId}`)}
                  className="section-row"
                >
                  <div className="section-row__main">
                    <span className="section-row__title">{item.companyName}</span>
                    <span className="section-row__meta">Due: {item.followUpDate}</span>
                  </div>
                  <span className="section-row__action">View →</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
