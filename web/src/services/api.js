// web/src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 10000,
});

// Track if we're already redirecting to prevent multiple redirects
let isRedirecting = false;

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`[API] Response ${response.status} from ${response.config.url}`);
    return response;
  },
  (error) => {
    const { config, response } = error;
    
    console.error(`[API] Error ${response?.status} from ${config?.url}:`, error.message);
    
    // Handle different error types
    if (response?.status === 401) {
      // Don't redirect for auth endpoints - these are expected to fail sometimes
      const isAuthEndpoint = config?.url?.includes('/auth/');
      
      // Only redirect if we're not already redirecting and it's not an auth endpoint
      if (!isAuthEndpoint && !isRedirecting && window.location.pathname !== '/login') {
        isRedirecting = true;
        console.log('[API] Unauthorized access, redirecting to login...');
        
        // Reset the flag after a delay to allow future redirects if needed
        setTimeout(() => {
          isRedirecting = false;
        }, 1000);
        
        window.location.href = '/login';
      }
    } else if (response?.status === 500) {
      console.error('[API] Server error:', response?.data);
      // Don't redirect on 500 errors, let the component handle it
    } else if (response?.status >= 400 && response?.status < 500) {
      console.warn('[API] Client error:', response?.status, response?.data);
    } else if (!response) {
      console.error('[API] Network error or timeout');
    }
    
    return Promise.reject(error);
  }
);

export default api;