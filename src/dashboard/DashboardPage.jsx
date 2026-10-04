import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useDashboardQuery, useApplicationsQuery, useOpeningsQuery } from '../api/queries';
import StatusControl from '../applications/StatusControl';
import QueryStateNotice from '../components/QueryStateNotice';
import { AnimatePresence, m } from 'framer-motion';
import { listItemVariants } from '../lib/motion';
import './DashboardPage.css';

function CountUpNumber({ value }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = parseInt(value, 10) || 0;
    if (end === 0) {
      setDisplayValue(0);
      return;
    }
    const duration = 400;
    const startTime = performance.now();

    function update(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(start + (end - start) * ease));
      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }
    requestAnimationFrame(update);
  }, [value]);

  return <span className="tabular-nums">{displayValue}</span>;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.userId || user?.id || user?.email;

  const {
    data: dashboardData,
    isLoading: dashLoading,
    isFetching: dashFetching,
    isError: dashIsError,
    error: dashErr,
    refetch: dashRefetch,
  } = useDashboardQuery(userId);

  const {
    data: applicationsData,
    isFetching: appsFetching,
    isError: appsIsError,
    error: appsErr,
    refetch: appsRefetch,
  } = useApplicationsQuery(userId);

  const {
    data: openingsData,
    isFetching: opsFetching,
    isError: opsIsError,
    error: opsErr,
    refetch: opsRefetch,
  } = useOpeningsQuery(userId);

  const initialLoading = dashLoading && !dashboardData;

  if (initialLoading) {
    return (
      <div className="dashboard-loading">
        <span className="spinner" />
        <span>Loading workspace dashboard...</span>
      </div>
    );
  }

  if (dashIsError && !dashboardData) {
    return (
      <div className="dashboard-error">
        Failed to load dashboard metrics.
        <button type="button" onClick={() => dashRefetch()} className="btn-secondary btn-sm" style={{ marginLeft: '12px' }}>
          Retry
        </button>
      </div>
    );
  }

  const isBackgroundFetching = dashFetching || appsFetching || opsFetching;
  const hasBackgroundError = (dashIsError || appsIsError || opsIsError) && !!dashboardData;
  const backgroundErr = dashErr || appsErr || opsErr;

  const refetchAll = () => {
    dashRefetch();
    appsRefetch();
    opsRefetch();
  };

  const recentApplications = (applicationsData || []).slice(0, 5);
  const openingsCount = (openingsData || []).length;

  const { statusCounts = {}, upcomingInterviews = [], followUpsDue = [], upcomingFollowUps = [] } = dashboardData || {};

  const activeApplicationsCount = (statusCounts.APPLIED || 0) + (statusCounts.SCREENING || 0) + (statusCounts.INTERVIEW || 0) + (statusCounts.OFFER || 0);

  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const prominentInterviews = upcomingInterviews.filter(item => new Date(item.interviewDate) <= in7Days);
  const laterInterviews = upcomingInterviews.filter(item => new Date(item.interviewDate) > in7Days);

  return (
    <div className="dashboard-container">
      <QueryStateNotice
        isFetching={isBackgroundFetching && !dashLoading}
        isError={hasBackgroundError}
        error={backgroundErr}
        refetch={refetchAll}
      />

      {/* Header */}
      <div className="dashboard-hero">
        <div className="dashboard-hero__content">
          <h1 className="dashboard-title">Welcome back</h1>
          <p className="dashboard-subtitle">Here's where your job search stands today.</p>
        </div>
        <button onClick={() => navigate('/applications/new')} className="btn-primary">
          <span className="btn-text-desktop">+ Add application</span>
          <span className="btn-text-mobile">+</span>
        </button>
      </div>

      {/* Landing Showcase Style 3 Metric Cards */}
      <div className="dashboard-metrics-grid">
        <div className="dash-metric-card" onClick={() => navigate('/applications')}>
          <span className="dash-metric-card__label">Active applications</span>
          <span className="dash-metric-card__val"><CountUpNumber value={activeApplicationsCount} /></span>
        </div>

        <div className="dash-metric-card" onClick={() => navigate('/interviews')}>
          <span className="dash-metric-card__label">Interviews this week</span>
          <span className="dash-metric-card__val"><CountUpNumber value={upcomingInterviews.length} /></span>
        </div>

        <div className="dash-metric-card" onClick={() => navigate('/openings')}>
          <span className="dash-metric-card__label">Placement openings</span>
          <span className="dash-metric-card__val"><CountUpNumber value={openingsCount} /></span>
        </div>
      </div>

      {/* Application Pipeline Stage Bar */}
      <div className="dash-pipeline-container">
        <div className="dash-pipeline-header">
          <span>Application pipeline breakdown</span>
          <span className="tabular-nums">{activeApplicationsCount} Active</span>
        </div>
        <div className="dash-pipeline-bar">
          {['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN'].map((st) => {
            const cnt = statusCounts[st] || 0;
            const totalSum = Object.values(statusCounts).reduce((a, b) => a + b, 0) || 1;
            const pct = (cnt / totalSum) * 100;
            if (pct === 0) return null;
            return (
              <m.div
                key={st}
                className={`dash-pipeline-segment dash-pipeline-segment--${st.toLowerCase()}`}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                title={`${st}: ${cnt}`}
              />
            );
          })}
        </div>
        <div className="dash-pipeline-legend">
          {['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN'].map((st) => {
            const cnt = statusCounts[st] || 0;
            if (cnt === 0) return null;
            return (
              <div key={st} className="dash-legend-item">
                <span className={`dash-legend-dot dash-pipeline-segment--${st.toLowerCase()}`} />
                <span>{st.charAt(0) + st.slice(1).toLowerCase()}: {cnt}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ticket Showcase Section matching Landing Showcase Card */}
      {recentApplications.length > 0 && (
        <div className="dash-tickets-section">
          <div className="dash-section-header">
            <h2 className="section-title">Recent applications</h2>
            <button type="button" className="btn-secondary btn-sm" onClick={() => navigate('/applications')}>
              View all applications →
            </button>
          </div>

          <div className="dash-tickets-list">
            <AnimatePresence>
              {recentApplications.map(app => (
                <m.div
                  key={app.id}
                  layout
                  variants={listItemVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
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
                </m.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Two-column working area */}
      <div className="dashboard-grid">
        {/* Left column: Upcoming Interviews */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2 className="section-title">Upcoming interviews</h2>
          </div>
          {upcomingInterviews.length === 0 ? (
            <div className="section-empty-box">
              <p className="section-empty">No interviews yet. Add one from an application.</p>
              <button type="button" className="btn-secondary btn-sm" onClick={() => navigate('/applications')}>
                View applications
              </button>
            </div>
          ) : (
            <div className="section-list">
              <AnimatePresence>
                {prominentInterviews.map((item, idx) => (
                  <m.div
                    key={`prominent-int-${idx}`}
                    layout
                    variants={listItemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
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
                  </m.div>
                ))}
              </AnimatePresence>

              {laterInterviews.length > 0 && (
                <div className="sublist-group">
                  <div className="sublist-header">Later</div>
                  <AnimatePresence>
                    {laterInterviews.map((item, idx) => (
                      <m.div
                        key={`later-int-${idx}`}
                        layout
                        variants={listItemVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
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
                      </m.div>
                    ))}
                  </AnimatePresence>
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
            <div className="section-empty-box">
              <p className="section-empty">You're all caught up. Set a follow-up date on an application to see it here.</p>
              <button type="button" className="btn-secondary btn-sm" onClick={() => navigate('/applications')}>
                View applications
              </button>
            </div>
          ) : (
            <div className="section-list">
              <AnimatePresence>
                {followUpsDue.map((item, idx) => (
                  <m.div
                    key={`due-fu-${idx}`}
                    layout
                    variants={listItemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    onClick={() => navigate(`/applications/${item.applicationId}`)}
                    className="section-row"
                  >
                    <div className="section-row__main">
                      <span className="section-row__title">{item.companyName}</span>
                      <span className="section-row__meta">Due: {item.followUpDate}</span>
                    </div>
                    <span className="section-row__action">View →</span>
                  </m.div>
                ))}
              </AnimatePresence>

              {upcomingFollowUps.length > 0 && (
                <div className="sublist-group">
                  <div className="sublist-header">Upcoming</div>
                  <AnimatePresence>
                    {upcomingFollowUps.map((item, idx) => (
                      <m.div
                        key={`upcoming-fu-${idx}`}
                        layout
                        variants={listItemVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={() => navigate(`/applications/${item.applicationId}`)}
                        className="section-row section-row--quiet"
                      >
                        <div className="section-row__main">
                          <span className="section-row__title">{item.companyName}</span>
                          <span className="section-row__meta">Upcoming: {item.followUpDate}</span>
                        </div>
                        <span className="section-row__action">View →</span>
                      </m.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
