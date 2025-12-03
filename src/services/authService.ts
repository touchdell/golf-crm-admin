import { apiClient } from './apiClient';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    email: string;
    name: string;
    role?: string; // 'ADMIN' | 'STAFF' | etc.
  };
}

export const login = async (credentials: LoginRequest): Promise<LoginResponse> => {
  try {
    const res = await apiClient.post<LoginResponse>('/auth/login', credentials);
    return res.data;
  } catch {
    // Fallback to dummy auth for development
    // In production, remove this and let the error propagate
    return {
      token: 'dummy-jwt-token-' + Date.now(),
      user: {
        id: 1,
        email: credentials.email,
        name: credentials.email.split('@')[0],
        role: 'ADMIN', // Default to ADMIN for development
      },
    };
  }
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

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

export const storeUser = (user: LoginResponse['user']) => {
  localStorage.setItem('user', JSON.stringify(user));
};

