import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

/** Gate any authenticated area. Optionally require the System-Admin role. */
export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, booting } = useAuth();
  const loc = useLocation();

  if (booting) {
    return (
      <div className="full-center">
        <div className="boot-spinner" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (user.mustChangePassword && loc.pathname !== '/change-password')
    return <Navigate to="/change-password" replace />;
  if (requireAdmin && user.role !== 'super_admin') return <Navigate to="/" replace />;

  return children;
}
