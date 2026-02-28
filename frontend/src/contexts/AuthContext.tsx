import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { API_URL } from '@/config';
import { mockDb } from '@/db/mockDb';
import type { Profile } from '@/types';

interface User {
  id: string;
  email?: string;
  username: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signInWithUsername: (username: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithUsername: (username: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const response = await fetch(`${API_URL}/profiles?id=${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      } else {
        // Fallback to mock
        const mockProfile = mockDb.find('profiles', userId);
        if (mockProfile) setProfile(mockProfile);
      }
    } catch (error) {
      console.warn('Failed to fetch profile from server, using Mock DB');
      const mockProfile = mockDb.find('profiles', userId);
      if (mockProfile) setProfile(mockProfile);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          if (userData && userData.id) {
            setUser(userData);
            await fetchProfile(userData.id); // Wait for profile before releasing loading
          } else {
            console.warn('Invalid user data found in localStorage');
          }
        } catch (err) {
          console.error('Failed to parse stored user:', err);
          localStorage.removeItem('user');
          localStorage.removeItem('token');
        }
      }
      setLoading(false); // Only set loading=false AFTER profile is fetched
    };

    initAuth();
  }, []);

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const signInWithUsername = async (username: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      setUser(data.user);
      setProfile(data.user);

      return { error: null };
    } catch (error: any) {
      // If server is unreachable (Failed to fetch), use Mock Authentication
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.warn('Login server unreachable. Attempting Mock Login...');

        const mockUser = mockDb.query('profiles', (p: any) => p.username === username)[0];

        if (mockUser) {
          // Success mock login
          const sessionUser = {
            id: mockUser.id,
            username: mockUser.username,
            role: mockUser.role,
            email: `${mockUser.username}@mock.com`
          };

          localStorage.setItem('token', 'mock-jwt-token');
          localStorage.setItem('user', JSON.stringify(sessionUser));

          setUser(sessionUser);
          setProfile(mockUser);

          return { error: null };
        } else {
          return { error: new Error('Invalid credentials (Mock Mode)') };
        }
      }
      return { error: error as Error };
    }
  };

  const signUpWithUsername = async (username: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      return { error: null };
    } catch (error: any) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        // Mock registration
        mockDb.insert('profiles', {
          username,
          full_name: username,
          role: 'employee',
          status: 'active'
        });
        return { error: null };
      }
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithUsername, signUpWithUsername, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
