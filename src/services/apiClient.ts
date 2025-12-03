import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api', // adjust if backend is on another host
});

// Helper function to get token from localStorage
// This is used by the interceptor since it can't access React context
const getTokenFromStorage = (): string | null => {
  return localStorage.getItem('token');
};

// Attach JWT token to all requests
apiClient.interceptors.request.use(
  (config) => {
    const token = getTokenFromStorage();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Handle 401 unauthorized responses
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear storage and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);