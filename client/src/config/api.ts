// Use MODE instead of DEV for robust production detection
const isProduction = import.meta.env.MODE === 'production';

// API configuration for both development and production
export const API_BASE_URL = isProduction
  ? import.meta.env.VITE_API_URL || '/api'
  : 'http://localhost:5002/api';

// Detailed debug logging
console.log('🌐 API Configuration:', {
  isProduction,
  API_BASE_URL,
  environment: import.meta.env.MODE,
  dev: import.meta.env.DEV,
  prod: import.meta.env.PROD,
  VITE_API_URL: import.meta.env.VITE_API_URL
});

export const API_ENDPOINTS = {
  login: `${API_BASE_URL}/auth/admin/login`,
  profile: `${API_BASE_URL}/profile`,
  users: `${API_BASE_URL}/users`,
  tournaments: `${API_BASE_URL}/tournaments`,
  notifications: `${API_BASE_URL}/notifications`,
  dashboard: `${API_BASE_URL}/stats/dashboard`
};
