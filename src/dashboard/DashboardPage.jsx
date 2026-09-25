import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../auth/AuthContext';
import './DashboardPage.css';

export default function DashboardPage() {
  const { user } = useAuth();
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
      {/* Banner / Greeting */}
      <div className="dashboard-hero">
        <div className="dashboard-hero__content">
          <h1>Welcome back! 👋</h1>
          <p>Here is an overview of your active job search activities.</p>
        </div>
        <button onClick={() => navigate('/applications/new')} className="btn-primary">
          + New Application
        </button>
      </div>

      {/* Metric Cards */}
      <div className="dashboard-metrics">
        <div className="metric-card metric-card--applied">
          <span className="metric-card__label">Applied</span>
          <span className="metric-card__value">{statusCounts.APPLIED || 0}</span>
        </div>

        <div className="metric-card metric-card--screening">
          <span className="metric-card__label">Screening</span>
          <span className="metric-card__value">{statusCounts.SCREENING || 0}</span>
        </div>

        <div className="metric-card metric-card--interview">
          <span className="metric-card__label">Interviews</span>
          <span className="metric-card__value">{statusCounts.INTERVIEW || 0}</span>
        </div>

        <div className="metric-card metric-card--offer">
          <span className="metric-card__label">Offers</span>
          <span className="metric-card__value">{statusCounts.OFFER || 0}</span>
        </div>

        <div className="metric-card metric-card--rejected">
          <span className="metric-card__label">Rejected</span>
          <span className="metric-card__value">{statusCounts.REJECTED || 0}</span>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="dashboard-grid">
        {/* Upcoming Interviews */}
        <div className="dashboard-panel">
          <div className="panel-header">
            <h3>📅 Upcoming Interviews (Next 7 Days)</h3>
          </div>
          {upcomingInterviews.length === 0 ? (
            <p className="panel-empty">No upcoming interviews scheduled for the next 7 days.</p>
          ) : (
            <div className="panel-list">
              {upcomingInterviews.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => navigate(`/applications/${item.applicationId}`)}
                  className="panel-item panel-item--clickable"
                >
                  <div className="panel-item__main">
                    <span className="panel-item__title">{item.companyName}</span>
                    <span className="panel-item__meta">
                      {new Date(item.interviewDate).toLocaleString()}
                    </span>
                  </div>
                  <span className="panel-item__action">View →</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Follow Ups Due */}
        <div className="dashboard-panel">
          <div className="panel-header">
            <h3>⏰ Follow-ups Due</h3>
          </div>
          {followUpsDue.length === 0 ? (
            <p className="panel-empty">No follow-ups due today.</p>
          ) : (
            <div className="panel-list">
              {followUpsDue.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => navigate(`/applications/${item.applicationId}`)}
                  className="panel-item panel-item--clickable"
                >
                  <div className="panel-item__main">
                    <span className="panel-item__title">{item.companyName}</span>
                    <span className="panel-item__meta">Due: {item.followUpDate}</span>
                  </div>
                  <span className="panel-item__action">View →</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
