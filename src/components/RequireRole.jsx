import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RequireRole({ roles, children }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!user.role) {
    return (
      <div style={{
        padding: 40, textAlign: 'center', color: '#fca5a5',
        background: 'rgba(248,113,113,0.12)',
        border: '1px solid rgba(248,113,113,0.32)',
        borderRadius: 16, margin: 40,
      }}>
        <h2>No role assigned to your account</h2>
        <p style={{ color: '#8a94ad' }}>Ask an admin to assign you a role.</p>
      </div>
    );
  }
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}