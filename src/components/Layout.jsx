import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import './Layout.css';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={`app-layout ${isCollapsed ? 'app-layout--sidebar-collapsed' : ''}`}>
      {/* Compact Sidebar with collapse/expand toggle */}
      <aside className={`app-sidebar ${isCollapsed ? 'app-sidebar--collapsed' : ''}`}>
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
            {isCollapsed ? '»' : '«'}
          </button>
        </div>

        <nav className="app-sidebar__nav">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `app-sidebar__link ${isActive ? 'app-sidebar__link--active' : ''}`}
            title="Dashboard"
          >
            <span className="app-sidebar__link-icon">D</span>
            {!isCollapsed && <span className="app-sidebar__link-text">Dashboard</span>}
          </NavLink>
          <NavLink
            to="/applications"
            className={({ isActive }) => `app-sidebar__link ${isActive ? 'app-sidebar__link--active' : ''}`}
            title="Applications"
          >
            <span className="app-sidebar__link-icon">A</span>
            {!isCollapsed && <span className="app-sidebar__link-text">Applications</span>}
          </NavLink>
          <NavLink
            to="/interviews"
            className={({ isActive }) => `app-sidebar__link ${isActive ? 'app-sidebar__link--active' : ''}`}
            title="Interviews"
          >
            <span className="app-sidebar__link-icon">I</span>
            {!isCollapsed && <span className="app-sidebar__link-text">Interviews</span>}
          </NavLink>
          <NavLink
            to="/assistant"
            className={({ isActive }) => `app-sidebar__link ${isActive ? 'app-sidebar__link--active' : ''}`}
            title="AI Assistant"
          >
            <span className="app-sidebar__link-icon">AI</span>
            {!isCollapsed && <span className="app-sidebar__link-text">AI Assistant</span>}
          </NavLink>
          <NavLink
            to="/profile"
            className={({ isActive }) => `app-sidebar__link ${isActive ? 'app-sidebar__link--active' : ''}`}
            title="Profile"
          >
            <span className="app-sidebar__link-icon">P</span>
            {!isCollapsed && <span className="app-sidebar__link-text">Profile</span>}
          </NavLink>
        </nav>

        <div className="app-sidebar__footer">
          {!isCollapsed && (
            <div className="app-sidebar__user-info">
              <span className="app-sidebar__user-email">{user?.email}</span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="app-sidebar__logout-btn"
            title="Sign out"
            aria-label="Sign out"
          >
            {isCollapsed ? '⎋' : 'Sign out'}
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
