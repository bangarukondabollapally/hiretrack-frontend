import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useChatHistory } from '../assistant/useChatHistory';
import ChatHistoryList from '../assistant/ChatHistoryList';
import './Layout.css';

const INITIAL_GREETING = "What can I help you with today?";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('ht_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Initialize single source of truth chat history for current user
  const chatHistory = useChatHistory(user?.userId, INITIAL_GREETING);

  const toggleCollapsed = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('ht_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Close mobile drawer on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectConversation = (id) => {
    chatHistory.switchConversation(id);
    if (location.pathname !== '/assistant') {
      navigate('/assistant');
    }
    closeMobileMenu();
  };

  const handleNewChat = () => {
    chatHistory.newConversation();
    if (location.pathname !== '/assistant') {
      navigate('/assistant');
    }
    closeMobileMenu();
  };

  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : 'U';

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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
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
          <div className="app-sidebar__brand" title="HireTrack">
            <span className="app-sidebar__logo-mark">H</span>
            {(!isCollapsed || mobileMenuOpen) && <span className="app-sidebar__logo-text">HireTrack</span>}
          </div>
          <button
            type="button"
            className="app-sidebar__toggle-btn"
            onClick={toggleCollapsed}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M9 3v18" />
                <path d="m14 9 3 3-3 3" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M9 3v18" />
                <path d="m16 15-3-3 3-3" />
              </svg>
            )}
          </button>
        </div>

        <nav className="app-sidebar__nav">
          {user?.role !== 'ADMIN' && (
            <NavLink
              to="/dashboard"
              onClick={closeMobileMenu}
              className={({ isActive }) => `app-sidebar__link ${isActive ? 'app-sidebar__link--active' : ''}`}
              title="Dashboard"
              aria-label="Dashboard"
            >
              <span className="app-sidebar__link-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="7" height="9" x="3" y="3" rx="1" />
                  <rect width="7" height="5" x="14" y="3" rx="1" />
                  <rect width="7" height="9" x="14" y="12" rx="1" />
                  <rect width="7" height="5" x="3" y="16" rx="1" />
                </svg>
              </span>
              <span className="app-sidebar__link-text">Dashboard</span>
            </NavLink>
          )}

          <NavLink
            to="/openings"
            onClick={closeMobileMenu}
            className={({ isActive }) => `app-sidebar__link ${isActive ? 'app-sidebar__link--active' : ''}`}
            title="Placement Openings"
            aria-label="Placement Openings"
          >
            <span className="app-sidebar__link-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 13.255A23.931 23.931 0 0 1 12 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2m4 6h.01M5 20h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z" />
              </svg>
            </span>
            <span className="app-sidebar__link-text">Openings</span>
          </NavLink>

          {user?.role === 'ADMIN' && (
            <NavLink
              to="/admin/openings"
              onClick={closeMobileMenu}
              className={({ isActive }) => `app-sidebar__link ${isActive ? 'app-sidebar__link--active' : ''}`}
              title="Manage Openings (Admin)"
              aria-label="Manage Openings (Admin)"
            >
              <span className="app-sidebar__link-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </span>
              <span className="app-sidebar__link-text">Manage Openings</span>
            </NavLink>
          )}

          {user?.role !== 'ADMIN' && (
            <>
              <NavLink
                to="/applications"
                onClick={closeMobileMenu}
                className={({ isActive }) => `app-sidebar__link ${isActive ? 'app-sidebar__link--active' : ''}`}
                title="Applications"
                aria-label="Applications"
              >
                <span className="app-sidebar__link-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
                aria-label="Interviews"
              >
                <span className="app-sidebar__link-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
                aria-label="AI Assistant"
              >
                <span className="app-sidebar__link-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z" />
                  </svg>
                </span>
                <span className="app-sidebar__link-text">AI Assistant</span>
              </NavLink>
            </>
          )}

          <NavLink
            to="/profile"
            onClick={closeMobileMenu}
            className={({ isActive }) => `app-sidebar__link ${isActive ? 'app-sidebar__link--active' : ''}`}
            title="Settings"
            aria-label="Settings"
          >
            <span className="app-sidebar__link-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </span>
            <span className="app-sidebar__link-text">Settings</span>
          </NavLink>

          {/* Render Chat History inside Sidebar when expanded or inside mobile drawer */}
          {(!isCollapsed || mobileMenuOpen) && (
            <div className="app-sidebar__history-slot">
              <ChatHistoryList
                conversations={chatHistory.conversations}
                activeId={chatHistory.activeId}
                onSelectConversation={handleSelectConversation}
                onNewChat={handleNewChat}
                onRenameConversation={chatHistory.renameConversation}
                onDeleteConversation={chatHistory.deleteConversation}
                onTogglePinConversation={chatHistory.togglePinConversation}
              />
            </div>
          )}
        </nav>

        <div className="app-sidebar__footer">
          {isCollapsed && !mobileMenuOpen ? (
            <div className="app-sidebar__footer-collapsed">
              <div className="app-sidebar__avatar-circle" title={user?.email}>
                {userInitial}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="app-sidebar__logout-btn-icon"
                title="Sign out"
                aria-label="Sign out"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="app-sidebar__footer-expanded">
              <div className="app-sidebar__user-row" title={user?.email}>
                <div className="app-sidebar__avatar-circle">
                  {userInitial}
                </div>
                <span className="app-sidebar__user-email">{user?.email}</span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="app-sidebar__logout-btn"
                title="Sign out"
                aria-label="Sign out"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="app-main">
        <div className="app-main__container">
          <Outlet context={{
            ...chatHistory,
            isSidebarCollapsed: isCollapsed,
            toggleCollapsed,
            mobileMenuOpen,
            setMobileMenuOpen,
            closeMobileMenu,
          }} />
        </div>
      </main>
    </div>
  );
}
