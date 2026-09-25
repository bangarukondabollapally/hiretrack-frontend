import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import './Layout.css';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      {/* Compact Sidebar per DESIGN.md §11 */}
      <aside className="app-sidebar">
        <div className="app-sidebar__header">
          <div className="app-sidebar__brand">
            <span className="app-sidebar__logo-mark">H</span>
            <span className="app-sidebar__logo-text">HireTrack</span>
          </div>
        </div>

        <nav className="app-sidebar__nav">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `app-sidebar__link ${isActive ? 'app-sidebar__link--active' : ''}`}
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/applications"
            className={({ isActive }) => `app-sidebar__link ${isActive ? 'app-sidebar__link--active' : ''}`}
          >
            Applications
          </NavLink>
          <NavLink
            to="/interviews"
            className={({ isActive }) => `app-sidebar__link ${isActive ? 'app-sidebar__link--active' : ''}`}
          >
            Interviews
          </NavLink>
          <NavLink
            to="/assistant"
            className={({ isActive }) => `app-sidebar__link ${isActive ? 'app-sidebar__link--active' : ''}`}
          >
            AI Assistant
          </NavLink>
          <NavLink
            to="/profile"
            className={({ isActive }) => `app-sidebar__link ${isActive ? 'app-sidebar__link--active' : ''}`}
          >
            Profile
          </NavLink>
        </nav>

        <div className="app-sidebar__footer">
          <div className="app-sidebar__user-info">
            <span className="app-sidebar__user-email">{user?.email}</span>
          </div>
          <button onClick={handleLogout} className="app-sidebar__logout-btn">
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
