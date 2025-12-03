import { supabase } from '../lib/supabase';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'USER';
}

export interface LoginResponse {
  token: string;
  user: User;
}

// Get user profile from user_profiles table
const getUserProfile = async (userId: string): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return {
      id: data.id,
      email: data.email,
      name: data.name || data.email.split('@')[0],
      role: (data.role as 'ADMIN' | 'USER') || 'USER',
    };
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    return null;
  }
};

export const login = async (credentials: LoginRequest): Promise<LoginResponse> => {
  try {
    // Sign in with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (authError) {
      throw authError;
    }

    if (!authData.user || !authData.session) {
      throw new Error('Authentication failed');
    }

    // Get user profile
    const userProfile = await getUserProfile(authData.user.id);

    if (!userProfile) {
      // If no profile exists, create a default one
      const { error: profileError } = await supabase.from('user_profiles').insert({
        id: authData.user.id,
        email: authData.user.email!,
        name: authData.user.email!.split('@')[0],
        role: 'USER', // Default role
      });

      if (profileError) {
        console.error('Error creating user profile:', profileError);
      }

      return {
        token: authData.session.access_token,
        user: {
          id: authData.user.id,
          email: authData.user.email!,
          name: authData.user.email!.split('@')[0],
          role: 'USER',
        },
      };
    }

    return {
      token: authData.session.access_token,
      user: userProfile,
    };
  } catch (error) {
    console.error('Login error:', error);
    const message = error instanceof Error ? error.message : 'Login failed';
    throw new Error(message);
  }
};

export const logout = async () => {
  await supabase.auth.signOut();
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const getCurrentSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

export const getCurrentUser = async (): Promise<User | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return getUserProfile(user.id);
};

// Helper functions for backward compatibility
export const getStoredToken = (): string | null => {
  return localStorage.getItem('token');
};

export const storeToken = (token: string) => {
  localStorage.setItem('token', token);
};

export const getStoredUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

export const storeUser = (user: User) => {
  localStorage.setItem('user', JSON.stringify(user));
};

