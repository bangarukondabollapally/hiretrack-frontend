import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function StudentRoute() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Admins are prohibited from viewing/accessing student personal data
  if (user?.role === 'ADMIN') {
    return <Navigate to="/admin/openings" replace />;
  }

  return <Outlet />;
}
