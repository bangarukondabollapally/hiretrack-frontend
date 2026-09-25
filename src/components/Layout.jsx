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
      <header className="app-header">
        <div className="app-header__container">
          <div className="app-header__brand">
            <span className="app-header__logo-icon">💼</span>
            <span className="app-header__logo-text">HireTrack</span>
          </div>

          <nav className="app-nav">
            <NavLink to="/dashboard" className={({ isActive }) => `app-nav__link ${isActive ? 'app-nav__link--active' : ''}`}>
              Dashboard
            </NavLink>
            <NavLink to="/applications" className={({ isActive }) => `app-nav__link ${isActive ? 'app-nav__link--active' : ''}`}>
              Applications
            </NavLink>
          </nav>

          <div className="app-header__user">
            <span className="app-header__email">{user?.email}</span>
            <button onClick={handleLogout} className="app-header__logout-btn">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="app-main__container">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
