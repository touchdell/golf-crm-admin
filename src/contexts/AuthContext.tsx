import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { login as authLogin, logout as authLogout, getCurrentUser, type LoginRequest, type User } from '../services/authService';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user session from Supabase on initialization
  useEffect(() => {
    let isMounted = true;
    
    const initializeAuth = async () => {
      try {
        // Check for existing session with timeout protection
        const sessionPromise = supabase.auth.getSession();
        const timeoutId = setTimeout(() => {
          console.warn('Session check taking too long, using fallback');
        }, 5000);
        
        const { data: { session }, error: sessionError } = await sessionPromise;
        clearTimeout(timeoutId);
        
        if (!isMounted) return;
        
        if (sessionError) {
          console.error('Error getting session:', sessionError);
          setLoading(false);
          return;
        }
        
        if (session?.user) {
          // Get user profile with timeout
          try {
            const profilePromise = getCurrentUser();
            const profileTimeout = setTimeout(() => {
              console.warn('Profile fetch timeout, using session data');
            }, 5000);
            
            const userProfile = await profilePromise;
            clearTimeout(profileTimeout);
            
            if (!isMounted) return;
            
            if (userProfile) {
              setUser(userProfile);
              setToken(session.access_token);
              localStorage.setItem('token', session.access_token);
              localStorage.setItem('user', JSON.stringify(userProfile));
            } else {
              // No profile found, but allow app to continue
              console.warn('No user profile found');
              setUser({
                id: session.user.id,
                email: session.user.email || '',
                name: session.user.email?.split('@')[0] || 'User',
                role: 'USER',
              });
              setToken(session.access_token);
              localStorage.setItem('token', session.access_token);
            }
          } catch (error) {
            console.error('Error fetching user profile:', error);
            if (!isMounted) return;
            // Use session data as fallback
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.email?.split('@')[0] || 'User',
              role: 'USER',
            });
            setToken(session.access_token);
            localStorage.setItem('token', session.access_token);
          }
        } else {
          // No session, check localStorage for backward compatibility
          const storedToken = localStorage.getItem('token');
          const storedUserStr = localStorage.getItem('user');
          if (storedToken && storedUserStr) {
            try {
              const storedUser = JSON.parse(storedUserStr);
              setToken(storedToken);
              setUser(storedUser);
            } catch {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
            }
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // On error, check localStorage as fallback
        const storedToken = localStorage.getItem('token');
        const storedUserStr = localStorage.getItem('user');
        if (storedToken && storedUserStr) {
          try {
            const storedUser = JSON.parse(storedUserStr);
            setToken(storedToken);
            setUser(storedUser);
          } catch {
            // Ignore parse errors
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();
    
    return () => {
      isMounted = false;
    };

    // Listen to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const userProfile = await getCurrentUser();
        if (userProfile) {
          setUser(userProfile);
          setToken(session.access_token);
          localStorage.setItem('token', session.access_token);
          localStorage.setItem('user', JSON.stringify(userProfile));
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setToken(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } else if (event === 'TOKEN_REFRESHED' && session) {
        setToken(session.access_token);
        localStorage.setItem('token', session.access_token);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (credentials: LoginRequest): Promise<void> => {
    try {
      const response = await authLogin(credentials);
      setToken(response.token);
      setUser(response.user);
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authLogout();
      setToken(null);
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch (error) {
      console.error('Logout error:', error);
      // Clear local state even if logout fails
      setToken(null);
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  };

  const value: AuthContextType = {
    user,
    token,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

