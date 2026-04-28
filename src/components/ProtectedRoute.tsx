// Protected Route Component
import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { UserPublic } from '../api';

interface ProtectedRouteProps {
  user: UserPublic | null;
  loading: boolean;
  children: ReactNode;
}

export default function ProtectedRoute({ user, loading, children }: ProtectedRouteProps) {
  // Show loading state while checking auth
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <p>Loading...</p>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Render protected content
  return <>{children}</>;
}
