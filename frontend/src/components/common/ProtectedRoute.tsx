import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) {
      console.log('ProtectedRoute: Still loading...');
      return;
    }

    if (!profile) {
      console.log('ProtectedRoute: No profile found, redirecting to login');
      navigate('/login', { replace: true });
      return;
    }

    console.log('ProtectedRoute: Checking access', {
      userRole: profile.role,
      allowedRoles,
      hasAccess: allowedRoles.includes(profile.role)
    });

    // Check if user's role is allowed to access this route
    if (!allowedRoles.includes(profile.role)) {
      console.warn(`ProtectedRoute: Access denied - User role "${profile.role}" not in allowed roles:`, allowedRoles);
      
      // Redirect to user's appropriate panel
      switch (profile.role) {
        case 'admin':
          console.log('ProtectedRoute: Redirecting to /admin');
          navigate('/admin', { replace: true });
          break;
        case 'hr':
          console.log('ProtectedRoute: Redirecting to /hr');
          navigate('/hr', { replace: true });
          break;
        case 'employee':
          console.log('ProtectedRoute: Redirecting to /employee');
          navigate('/employee', { replace: true });
          break;
        case 'client':
          console.log('ProtectedRoute: Redirecting to /client');
          navigate('/client', { replace: true });
          break;
        default:
          console.log('ProtectedRoute: Unknown role, redirecting to login');
          navigate('/login', { replace: true });
      }
    } else {
      console.log('ProtectedRoute: Access granted');
    }
  }, [profile, loading, allowedRoles, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Only render children if user has the correct role
  if (profile && allowedRoles.includes(profile.role)) {
    return <>{children}</>;
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );
}
