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
    
    // Handle 401 errors
    if (response?.status === 401) {
      // Don't redirect for auth endpoints - these are expected to fail sometimes
      const isAuthEndpoint = config?.url?.includes('/auth/');
      
      // Only redirect if we're not already redirecting and it's not an auth endpoint
      if (!isAuthEndpoint && !isRedirecting && window.location.pathname !== '/login') {
        isRedirecting = true;
        console.log('[API] Unauthorized access, redirecting to login...');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;