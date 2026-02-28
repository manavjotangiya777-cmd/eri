import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function RoleRedirect() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) {
      console.log('RoleRedirect: Still loading...');
      return;
    }

    if (!profile) {
      console.log('RoleRedirect: No profile found, redirecting to login');
      navigate('/login', { replace: true });
      return;
    }

    console.log('RoleRedirect: User profile loaded:', {
      username: profile.username,
      role: profile.role,
      id: profile.id
    });

    switch (profile.role) {
      case 'admin':
        console.log('RoleRedirect: Redirecting to /admin');
        navigate('/admin', { replace: true });
        break;
      case 'hr':
        console.log('RoleRedirect: Redirecting to /hr');
        navigate('/hr', { replace: true });
        break;
      case 'employee':
        console.log('RoleRedirect: Redirecting to /employee');
        navigate('/employee', { replace: true });
        break;
      case 'client':
        console.log('RoleRedirect: Redirecting to /client');
        navigate('/client', { replace: true });
        break;
      case 'bde':
        console.log('RoleRedirect: Redirecting to /bde');
        navigate('/bde', { replace: true });
        break;
      default:
        console.error('RoleRedirect: Unknown role:', profile.role);
        navigate('/login', { replace: true });
    }
  }, [profile, loading, navigate]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-muted-foreground">Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      <p className="text-muted-foreground">Redirecting...</p>
    </div>
  );
}
