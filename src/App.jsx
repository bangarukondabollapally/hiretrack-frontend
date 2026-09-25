/**
 * App.jsx — Root component for HireTrack.
 *
 * TASK-003 (setup): BrowserRouter is wired here; routes are placeholder stubs.
 * Full routing with ProtectedRoute, AuthContext, and page components is added in
 * TASK-009 (auth forms) and TASK-010 (AuthContext + ProtectedRoute).
 *
 * Route structure per docs/ARCHITECTURE.md and docs/API.md:
 *   /login            → LoginPage      (TASK-009)
 *   /register         → RegisterPage   (TASK-009)
 *   /dashboard        → DashboardPage  (TASK-023, protected)
 *   /applications     → ApplicationsList (TASK-014, protected)
 *   /applications/:id → ApplicationDetail (TASK-015, protected)
 *   /interviews       → InterviewTimeline (TASK-019, protected)
 *   /assistant        → ChatPage       (TASK-030, protected)
 *   /profile          → ProfilePage    (TASK-026, protected)
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

function PlaceholderPage({ name }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'var(--font-primary)',
        color: 'var(--text-secondary)',
        gap: '8px',
      }}
    >
      <span
        style={{
          fontSize: 'var(--text-page-heading)',
          fontWeight: 'var(--weight-semibold)',
          color: 'var(--text-primary)',
        }}
      >
        HireTrack
      </span>
      <span style={{ fontSize: 'var(--text-meta)' }}>
        {name} — coming in a future task
      </span>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes — implemented in TASK-009 */}
        <Route path="/login" element={<PlaceholderPage name="Login" />} />
        <Route path="/register" element={<PlaceholderPage name="Register" />} />

        {/* Protected routes — implemented from TASK-014 onward */}
        <Route path="/dashboard" element={<PlaceholderPage name="Dashboard" />} />
        <Route path="/applications" element={<PlaceholderPage name="Applications" />} />
        <Route path="/applications/:id" element={<PlaceholderPage name="Application Detail" />} />
        <Route path="/interviews" element={<PlaceholderPage name="Interviews" />} />
        <Route path="/assistant" element={<PlaceholderPage name="AI Assistant" />} />
        <Route path="/profile" element={<PlaceholderPage name="Profile" />} />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
