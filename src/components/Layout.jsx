import { useState, useEffect } from 'react';
import { NavLink, Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useProfileQuery, prefetchUserData, prefetchRouteData } from '../api/queries';
import { useChatHistory } from '../assistant/useChatHistory';
import ChatHistoryList from '../assistant/ChatHistoryList';
import { renderAvatarSvg } from '../lib/avatarPresets';
import BrandLogo from './BrandLogo';
import { AnimatePresence, m } from 'framer-motion';
import { pageVariants, modalBackdropVariants } from '../lib/motion';
import './Layout.css';

const INITIAL_GREETING = "What can I help you with today?";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const userId = user?.userId || user?.id || user?.email;

  const { data: profileData } = useProfileQuery(userId);

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

  // Parallel data prefetching on app load / auth change
  useEffect(() => {
    if (user?.userId) {
      prefetchUserData(user.userId, user.role);
    }
  }, [user?.userId, user?.role]);

  const handleLinkPrefetch = (path) => {
    if (user?.userId) {
      prefetchRouteData(user.userId, path);
    }
  };

  const toggleCollapsed = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('ht_sidebar_collapsed', String(next));
      } catch {
        /* ignore localStorage errors */
      }
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
  const homePath = user?.role === 'ADMIN' ? '/admin/openings' : '/dashboard';

  return (
    <div className={`app-layout ${isCollapsed ? 'app-layout--sidebar-collapsed' : ''}`}>
      {/* Mobile Top Header (visible below 768px) */}
      <header className="mobile-header">
        <BrandLogo
          as={Link}
          to={homePath}
          className="mobile-header__brand-link"
          title="HireTrack Dashboard"
          showText={true}
        />
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
      <AnimatePresence>
        {mobileMenuOpen && (
          <m.div
            variants={modalBackdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="mobile-drawer-backdrop"
            onClick={closeMobileMenu}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Sidebar / Slide-out Drawer */}
      <aside className={`app-sidebar ${isCollapsed ? 'app-sidebar--collapsed' : ''} ${mobileMenuOpen ? 'app-sidebar--mobile-open' : ''}`}>
        <div className="app-sidebar__header">
          <BrandLogo
            as={Link}
            to={homePath}
            className="app-sidebar__brand-link"
            title="HireTrack Dashboard"
            showText={!isCollapsed || mobileMenuOpen}
          />
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
              onMouseEnter={() => handleLinkPrefetch('/dashboard')}
              onFocus={() => handleLinkPrefetch('/dashboard')}
              onTouchStart={() => handleLinkPrefetch('/dashboard')}
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

          {user?.role !== 'ADMIN' && (
            <NavLink
              to="/openings"
              onClick={closeMobileMenu}
              onMouseEnter={() => handleLinkPrefetch('/openings')}
              onFocus={() => handleLinkPrefetch('/openings')}
              onTouchStart={() => handleLinkPrefetch('/openings')}
              className={({ isActive }) => `app-sidebar__link ${isActive ? 'app-sidebar__link--active' : ''}`}
              title="Placement Openings"
              aria-label="Placement Openings"
            >
              <span className="app-sidebar__link-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  <path d="M11 7v8M7 11h8" />
                </svg>
              </span>
              <span className="app-sidebar__link-text">Openings</span>
            </NavLink>
          )}

          {user?.role === 'ADMIN' && (
            <>
              <NavLink
                to="/admin/openings"
                end
                onClick={closeMobileMenu}
                onMouseEnter={() => handleLinkPrefetch('/admin/openings')}
                onFocus={() => handleLinkPrefetch('/admin/openings')}
                onTouchStart={() => handleLinkPrefetch('/admin/openings')}
                className={({ isActive }) => `app-sidebar__link ${isActive ? 'app-sidebar__link--active' : ''}`}
                title="Openings"
                aria-label="Openings"
              >
                <span className="app-sidebar__link-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    <path d="M11 7v8M7 11h8" />
                  </svg>
                </span>
                <span className="app-sidebar__link-text">Openings</span>
              </NavLink>

              <NavLink
                to="/admin/manageopenings"
                onClick={closeMobileMenu}
                onMouseEnter={() => handleLinkPrefetch('/admin/manageopenings')}
                onFocus={() => handleLinkPrefetch('/admin/manageopenings')}
                onTouchStart={() => handleLinkPrefetch('/admin/manageopenings')}
                className={({ isActive }) => `app-sidebar__link ${isActive ? 'app-sidebar__link--active' : ''}`}
                title="Manage Openings"
                aria-label="Manage Openings"
              >
                <span className="app-sidebar__link-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </span>
                <span className="app-sidebar__link-text">Manage Openings</span>
              </NavLink>
            </>
          )}

          {user?.role !== 'ADMIN' && (
            <>
              <NavLink
                to="/tracked-openings"
                onClick={closeMobileMenu}
                onMouseEnter={() => handleLinkPrefetch('/tracked-openings')}
                onFocus={() => handleLinkPrefetch('/tracked-openings')}
                onTouchStart={() => handleLinkPrefetch('/tracked-openings')}
                className={({ isActive }) => `app-sidebar__link ${isActive ? 'app-sidebar__link--active' : ''}`}
                title="Tracked Openings"
                aria-label="Tracked Openings"
              >
                <span className="app-sidebar__link-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  </svg>
                </span>
                <span className="app-sidebar__link-text">Tracked Openings</span>
              </NavLink>

              <NavLink
                to="/applications"
                onClick={closeMobileMenu}
                onMouseEnter={() => handleLinkPrefetch('/applications')}
                onFocus={() => handleLinkPrefetch('/applications')}
                onTouchStart={() => handleLinkPrefetch('/applications')}
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
                onMouseEnter={() => handleLinkPrefetch('/interviews')}
                onFocus={() => handleLinkPrefetch('/interviews')}
                onTouchStart={() => handleLinkPrefetch('/interviews')}
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
            to="/settings"
            onClick={closeMobileMenu}
            onMouseEnter={() => handleLinkPrefetch('/settings')}
            onFocus={() => handleLinkPrefetch('/settings')}
            onTouchStart={() => handleLinkPrefetch('/settings')}
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

          {/* Render Chat History inside Sidebar when expanded or inside mobile drawer for non-admin users */}
          {user?.role !== 'ADMIN' && (!isCollapsed || mobileMenuOpen) && (
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
              <div className="app-sidebar__avatar-wrapper" title={user?.email}>
                {profileData?.avatarDataUrl ? (
                  <img src={profileData.avatarDataUrl} alt="Avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  renderAvatarSvg(profileData?.avatarPreset, userInitial, 32)
                )}
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
                <div className="app-sidebar__avatar-wrapper">
                  {profileData?.avatarDataUrl ? (
                    <img src={profileData.avatarDataUrl} alt="Avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    renderAvatarSvg(profileData?.avatarPreset, userInitial, 32)
                  )}
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
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onAnimationStart={() => {
              window.scrollTo(0, 0);
            }}
            className="app-main__container"
          >
            <Outlet context={{
              ...chatHistory,
              isSidebarCollapsed: isCollapsed,
              toggleCollapsed,
              mobileMenuOpen,
              setMobileMenuOpen,
              closeMobileMenu,
            }} />
          </m.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
