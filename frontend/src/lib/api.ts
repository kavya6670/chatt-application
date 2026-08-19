import axios from 'axios';

export const getApiUrl = (): string => {
  if (typeof window !== 'undefined') {
    const customApi = localStorage.getItem('custom_api_url');
    if (customApi) return customApi;

    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envUrl && !envUrl.includes('localhost')) {
      return envUrl.startsWith('http') ? envUrl : `https://${envUrl}`;
    }

    const host = window.location.hostname;
    if (host.includes('onrender.com')) {
      if (host.includes('-frontend.')) {
        return `https://${host.replace('-frontend.', '-backend.')}`;
      }
      if (host.includes('frontend')) {
        return `https://${host.replace('frontend', 'backend')}`;
      }
    }

    if (envUrl) {
      return envUrl.startsWith('http') ? envUrl : `https://${envUrl}`;
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
};

const api = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

// Dynamically set baseURL and auth token on every request
api.interceptors.request.use((config) => {
  config.baseURL = getApiUrl();
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
