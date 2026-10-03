/**
 * App.jsx — Root component for HireTrack.
 *
 * Route structure per docs/ARCHITECTURE.md and docs/API.md:
 *   /login            → LoginPage      ✓ TASK-009
 *   /register         → RegisterPage   ✓ TASK-009
 *   /dashboard        → DashboardPage  ✓ TASK-023 (protected)
 *   /applications     → ApplicationsList ✓ TASK-014 (protected)
 *   /applications/new → ApplicationForm ✓ TASK-015 (protected)
 *   /applications/:id → ApplicationForm ✓ TASK-015 (protected)
 *   /profile          → ProfilePage    ✓ TASK-026 (protected)
 *   /assistant        → ChatPage       ✓ TASK-030 (protected)
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import ProtectedRoute from './auth/ProtectedRoute';
import AdminRoute from './auth/AdminRoute';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import LandingPage from './landing/LandingPage';
import LoginPage from './auth/LoginPage';
import RegisterPage from './auth/RegisterPage';
import DashboardPage from './dashboard/DashboardPage';
import ApplicationsList from './applications/ApplicationsList';
import ApplicationForm from './applications/ApplicationForm';
import InterviewsPage from './interviews/InterviewsPage';
import OpeningsPage from './openings/OpeningsPage';
import AdminOpeningsPage from './admin/AdminOpeningsPage';
import ProfilePage from './profile/ProfilePage';
import ChatPage from './assistant/ChatPage';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Landing Page at / */}
            <Route path="/" element={<LandingPage />} />

            {/* Public auth routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected routes wrapped with Layout */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/openings" element={<OpeningsPage />} />
                <Route path="/applications" element={<ApplicationsList />} />
                <Route path="/applications/new" element={<ApplicationForm />} />
                <Route path="/applications/:id" element={<ApplicationForm />} />
                <Route path="/interviews" element={<InterviewsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/assistant" element={<ChatPage />} />

                {/* Admin-only routes */}
                <Route element={<AdminRoute />}>
                  <Route path="/admin/openings" element={<AdminOpeningsPage />} />
                </Route>
              </Route>
            </Route>

            {/* Fallback redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
