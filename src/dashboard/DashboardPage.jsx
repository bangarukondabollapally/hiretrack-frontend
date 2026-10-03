import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import StatusControl from '../applications/StatusControl';
import './DashboardPage.css';

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState(null);
  const [openingsCount, setOpeningsCount] = useState(0);
  const [recentApplications, setRecentApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // SWR: Load from cache immediately if present
    const cachedDash = sessionStorage.getItem('ht_cache_dashboard');
    if (cachedDash) {
      try {
        setDashboardData(JSON.parse(cachedDash));
        setIsLoading(false);
      } catch (e) {
        setIsLoading(true);
      }
    } else {
      setIsLoading(true);
    }
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [dashRes, appsRes, openingsRes] = await Promise.all([
        axiosInstance.get('/api/dashboard'),
        axiosInstance.get('/api/applications'),
        axiosInstance.get('/api/openings')
      ]);

      setDashboardData(dashRes.data);
      sessionStorage.setItem('ht_cache_dashboard', JSON.stringify(dashRes.data));

      if (appsRes.data) {
        setRecentApplications(appsRes.data.slice(0, 5));
      }

      if (openingsRes.data) {
        setOpeningsCount(openingsRes.data.length);
      }
    } catch (err) {
      if (!dashboardData) {
        setError('Failed to load dashboard metrics.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <span className="spinner" />
        <span>Loading workspace dashboard...</span>
      </div>
    );
  }

  if (error) {
    return <div className="dashboard-error">{error}</div>;
  }

  const { statusCounts = {}, upcomingInterviews = [], followUpsDue = [], upcomingFollowUps = [] } = dashboardData || {};

  const activeApplicationsCount = (statusCounts.APPLIED || 0) + (statusCounts.SCREENING || 0) + (statusCounts.INTERVIEW || 0) + (statusCounts.OFFER || 0);

  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const prominentInterviews = upcomingInterviews.filter(item => new Date(item.interviewDate) <= in7Days);
  const laterInterviews = upcomingInterviews.filter(item => new Date(item.interviewDate) > in7Days);

  return (
    <div className="dashboard-container">
      {/* Header */}
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

      {/* Landing Showcase Style 3 Metric Cards */}
      <div className="dashboard-metrics-grid">
        <div className="dash-metric-card" onClick={() => navigate('/applications')}>
          <span className="dash-metric-card__label">Active Applications</span>
          <span className="dash-metric-card__val">{activeApplicationsCount}</span>
        </div>

        <div className="dash-metric-card" onClick={() => navigate('/interviews')}>
          <span className="dash-metric-card__label">Upcoming Interviews</span>
          <span className="dash-metric-card__val">{upcomingInterviews.length}</span>
        </div>

        <div className="dash-metric-card" onClick={() => navigate('/openings')}>
          <span className="dash-metric-card__label">Placement Openings</span>
          <span className="dash-metric-card__val">{openingsCount}</span>
        </div>
      </div>

      {/* Ticket Showcase Section matching Landing Showcase Card */}
      {recentApplications.length > 0 && (
        <div className="dash-tickets-section">
          <div className="dash-section-header">
            <h2 className="section-title">Recent Applications</h2>
            <button type="button" className="btn-secondary btn-sm" onClick={() => navigate('/applications')}>
              View All Pipeline →
            </button>
          </div>

          <div className="dash-tickets-list">
            {recentApplications.map(app => (
              <div
                key={app.id}
                className="dash-ticket-card"
                onClick={() => navigate(`/applications/${app.id}`)}
              >
                <div className="ticket-left">
                  <span className="company">{app.companyName}</span>
                  <span className="role">{app.jobRole} {app.jobType ? `• ${app.jobType}` : ''}</span>
                </div>
                {app.appliedDate && (
                  <div className="ticket-dates">
                    {app.appliedDate} {app.followUpDate ? `→ ${app.followUpDate}` : ''}
                  </div>
                )}
                <div onClick={(e) => e.stopPropagation()}>
                  <StatusControl value={app.status} readOnly />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two-column working area */}
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
