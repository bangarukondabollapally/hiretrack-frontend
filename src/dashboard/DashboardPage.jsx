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
    // SWR: Load from cache immediately if present
    const cached = sessionStorage.getItem('ht_cache_dashboard');
    if (cached) {
      try {
        setDashboardData(JSON.parse(cached));
        setIsLoading(false);
      } catch (e) {
        setIsLoading(true);
      }
    } else {
      setIsLoading(true);
    }
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await axiosInstance.get('/api/dashboard');
      setDashboardData(response.data);
      sessionStorage.setItem('ht_cache_dashboard', JSON.stringify(response.data));
    } catch (err) {
      if (!dashboardData) {
        setError('Failed to load dashboard metrics.');
      }
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

  const { statusCounts = {}, upcomingInterviews = [], followUpsDue = [], upcomingFollowUps = [] } = dashboardData || {};

  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const prominentInterviews = upcomingInterviews.filter(item => new Date(item.interviewDate) <= in7Days);
  const laterInterviews = upcomingInterviews.filter(item => new Date(item.interviewDate) > in7Days);

  return (
    <div className="dashboard-container">
      {/* 1. Greeting + primary action per DESIGN.md §7 */}
      <div className="dashboard-hero">
        <div className="dashboard-hero__content">
          <h1 className="dashboard-title">Welcome back</h1>
          <p className="dashboard-subtitle">Here is an overview of your active job search activities.</p>
        </div>
        <button onClick={() => navigate('/applications/new')} className="btn-primary">
          <span className="btn-text-desktop">+ Add application</span>
          <span className="btn-text-mobile">+</span>
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
            <p className="section-empty">No upcoming interviews scheduled.</p>
          ) : (
            <div className="section-list">
              {prominentInterviews.map((item, idx) => (
                <div
                  key={`prominent-int-${idx}`}
                  onClick={() => navigate(`/applications/${item.applicationId}`)}
                  className="section-row"
                >
                  <div className="section-row__main">
                    <span className="section-row__title">
                      {item.companyName} {item.jobRole ? `— ${item.jobRole}` : ''}
                    </span>
                    <span className="section-row__meta">
                      {new Date(item.interviewDate).toLocaleString()}
                    </span>
                  </div>
                  <span className="section-row__action">View →</span>
                </div>
              ))}

              {laterInterviews.length > 0 && (
                <div className="sublist-group">
                  <div className="sublist-header">Later</div>
                  {laterInterviews.map((item, idx) => (
                    <div
                      key={`later-int-${idx}`}
                      onClick={() => navigate(`/applications/${item.applicationId}`)}
                      className="section-row section-row--quiet"
                    >
                      <div className="section-row__main">
                        <span className="section-row__title">
                          {item.companyName} {item.jobRole ? `— ${item.jobRole}` : ''}
                        </span>
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
          )}
        </div>

        {/* Right column: Follow-ups */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2 className="section-title">Follow-ups</h2>
          </div>
          {followUpsDue.length === 0 && upcomingFollowUps.length === 0 ? (
            <p className="section-empty">No follow-ups due or upcoming.</p>
          ) : (
            <div className="section-list">
              {followUpsDue.map((item, idx) => (
                <div
                  key={`due-fu-${idx}`}
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

              {upcomingFollowUps.length > 0 && (
                <div className="sublist-group">
                  <div className="sublist-header">Upcoming</div>
                  {upcomingFollowUps.map((item, idx) => (
                    <div
                      key={`upcoming-fu-${idx}`}
                      onClick={() => navigate(`/applications/${item.applicationId}`)}
                      className="section-row section-row--quiet"
                    >
                      <div className="section-row__main">
                        <span className="section-row__title">{item.companyName}</span>
                        <span className="section-row__meta">Upcoming: {item.followUpDate}</span>
                      </div>
                      <span className="section-row__action">View →</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
