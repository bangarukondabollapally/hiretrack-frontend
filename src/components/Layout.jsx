import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import './Layout.css';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className={`app-layout ${isCollapsed ? 'app-layout--sidebar-collapsed' : ''}`}>
      {/* Mobile Top Header (visible below 768px) */}
      <header className="mobile-header">
        <div className="mobile-header__brand">
          <span className="app-sidebar__logo-mark">H</span>
          <span className="app-sidebar__logo-text">HireTrack</span>
        </div>
        <button
          type="button"
          className="mobile-header__menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? (
            /* Close X Icon */
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            /* Hamburger Icon */
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="6" y2="6" />
              <line x1="4" x2="20" y1="18" y2="18" />
            </svg>
          )}
        </button>
      </header>

      {/* Backdrop for mobile drawer */}
      {mobileMenuOpen && (
        <div
          className="mobile-drawer-backdrop"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Sidebar / Slide-out Drawer */}
      <aside className={`app-sidebar ${isCollapsed ? 'app-sidebar--collapsed' : ''} ${mobileMenuOpen ? 'app-sidebar--mobile-open' : ''}`}>
        <div className="app-sidebar__header">
          <div className="app-sidebar__brand">
            <span className="app-sidebar__logo-mark">H</span>
            {!isCollapsed && <span className="app-sidebar__logo-text">HireTrack</span>}
          </div>
          <button
            type="button"
            className="app-sidebar__toggle-btn"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M9 3v18" />
                <path d="m14 9 3 3-3 3" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M9 3v18" />
                <path d="m16 15-3-3 3-3" />
              </svg>
            )}
          </button>
        </div>

        <nav className="app-sidebar__nav">
          <NavLink
            to="/dashboard"
            onClick={closeMobileMenu}
            className={({ isActive }) => `app-sidebar__link ${isActive ? 'app-sidebar__link--active' : ''}`}
            title="Dashboard"
          >
            <span className="app-sidebar__link-icon" aria-hidden="true">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect width="7" height="9" x="3" y="3" rx="1" />
                <rect width="7" height="5" x="14" y="3" rx="1" />
                <rect width="7" height="9" x="14" y="12" rx="1" />
                <rect width="7" height="5" x="3" y="16" rx="1" />
              </svg>
            </span>
            <span className="app-sidebar__link-text">Dashboard</span>
          </NavLink>
          <NavLink
            to="/applications"
            onClick={closeMobileMenu}
            className={({ isActive }) => `app-sidebar__link ${isActive ? 'app-sidebar__link--active' : ''}`}
            title="Applications"
          >
            <span className="app-sidebar__link-icon" aria-hidden="true">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="14" x="2" y="7" rx="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
            </span>
            <span className="app-sidebar__link-text">Applications</span>
          </NavLink>
          <NavLink
            to="/interviews"
            onClick={closeMobileMenu}
            className={({ isActive }) => `app-sidebar__link ${isActive ? 'app-sidebar__link--active' : ''}`}
            title="Interviews"
          >
            <span className="app-sidebar__link-icon" aria-hidden="true">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="4" rx="2" />
                <path d="M16 2v4" />
                <path d="M8 2v4" />
                <path d="M3 10h18" />
              </svg>
            </span>
            <span className="app-sidebar__link-text">Interviews</span>
          </NavLink>
          <NavLink
            to="/assistant"
            onClick={closeMobileMenu}
            className={({ isActive }) => `app-sidebar__link ${isActive ? 'app-sidebar__link--active' : ''}`}
            title="AI Assistant"
          >
            <span className="app-sidebar__link-icon" aria-hidden="true">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z" />
              </svg>
            </span>
            <span className="app-sidebar__link-text">AI Assistant</span>
          </NavLink>
          <NavLink
            to="/profile"
            onClick={closeMobileMenu}
            className={({ isActive }) => `app-sidebar__link ${isActive ? 'app-sidebar__link--active' : ''}`}
            title="Profile"
          >
            <span className="app-sidebar__link-icon" aria-hidden="true">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </span>
            <span className="app-sidebar__link-text">Profile</span>
          </NavLink>
        </nav>

        <div className="app-sidebar__footer">
          <div className="app-sidebar__user-info">
            <span className="app-sidebar__user-email">{user?.email}</span>
          </div>
          <button
            onClick={handleLogout}
            className="app-sidebar__logout-btn"
            title="Sign out"
            aria-label="Sign out"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="app-main">
        <div className="app-main__container">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
