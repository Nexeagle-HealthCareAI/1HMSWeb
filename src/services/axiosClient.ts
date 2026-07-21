import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError, InternalAxiosRequestConfig, AxiosHeaders } from 'axios';
import { useAuthStore } from '@/store/authStore';
import { useAppStore } from '@/store/appStore';
import { API_BASE_URL, DEFAULT_HEADERS, API_ENDPOINTS } from '@/app/api';
import { toast } from '@/hooks/use-toast';
import { mockAxiosAdapter } from './mockAdapter';

// API Configuration
const API_TIMEOUT = 30000; // 30 seconds

// Create axios instance
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: false, // Disable credentials for CORS
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Debug logging for development
    if (import.meta.env.DEV) {
      console.log('API Request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        baseURL: config.baseURL,
        fullURL: `${config.baseURL}${config.url}`,
        headers: config.headers,
      });
    }

    // Add authentication token to requests
    const token = useAuthStore.getState().getToken();
    if (token) {
      const headers = config.headers instanceof AxiosHeaders
        ? config.headers
        : AxiosHeaders.from(config.headers || {});

      headers.set('Authorization', `Bearer ${token}`);
      config.headers = headers;

      // If in mock bypass mode, use mock adapter
      if (token === 'mock-jwt-token-bypass') {
        config.adapter = mockAxiosAdapter as any;
      }
    }
    
    // Add CSRF token if available
    const csrfToken = localStorage.getItem('csrf-token');
    if (csrfToken && config.headers) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }

    // Add Save-Data header if low bandwidth mode is active
    if (useAppStore.getState().isLowBandwidthMode && config.headers) {
      config.headers['Save-Data'] = 'on';
    }
    
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

const AUTH_EXEMPT_ENDPOINTS = new Set<string>([
  API_ENDPOINTS.AUTH.LOGIN,
  API_ENDPOINTS.AUTH.SIGN_UP,
  API_ENDPOINTS.AUTH.SEND_OTP,
  API_ENDPOINTS.AUTH.OTP_CHECKER,
  API_ENDPOINTS.AUTH.SET_PASSWORD,
  API_ENDPOINTS.AUTH.RESET_PASSWORD,
]);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    // Debug logging for development
    if (import.meta.env.DEV) {
      console.log('API Response:', {
        status: response.status,
        statusText: response.statusText,
        url: response.config.url,
        data: response.data,
      });
    }
    
    // Handle successful responses
    return response;
  },
  (error: AxiosError) => {
    // Handle different types of errors
    if (error.response) {
      const { status, data } = error.response;
      const requestUrl = error.config?.url || '';
      const isAuthExempt = AUTH_EXEMPT_ENDPOINTS.has(requestUrl);
      
      switch (status) {
        case 401:
          if (!isAuthExempt) {
            // DEV-only IPD preview routes render the app shell without a real login, so shell
            // background calls return 401 — don't hijack the preview by redirecting to /login.
            const isDevPreview = import.meta.env.DEV && /(-preview|mobile-review)/.test(window.location.pathname);
            if (!isDevPreview) {
              // Unauthorized - clear auth and redirect to login for protected endpoints
              useAuthStore.getState().logout();
              window.location.href = '/login';
            }
          }
          break;
          
        case 402: {
          // Subscription expired/blocked (HospitalAccessFilter.cs) — { message, subscriptionExpired: true }.
          const body = data as { message?: string; subscriptionExpired?: boolean } | undefined;
          const roles = useAuthStore.getState().getUserRoles() || [];
          const isAdmin = roles.includes('Admin') || roles.includes('AdminDoctor');
          toast({
            title: 'Subscription required',
            description: body?.message || 'Your trial or subscription has expired.',
            variant: 'destructive',
          });
          if (isAdmin && window.location.pathname !== '/subscription') {
            window.location.href = '/subscription';
          }
          break;
        }

        case 403: {
          // Forbidden - user doesn't have permission
          const body = data as { message?: string; subscriptionExpired?: boolean } | undefined;
          if (body?.subscriptionExpired) {
            // Subscription expired/blocked and this user isn't Admin/AdminDoctor (HospitalAccessFilter.cs).
            // MainLayout's proactive status check is the primary gate; this is a fallback in case
            // some request lands before that check has resolved.
            toast({
              title: 'Subscription expired',
              description: body.message || 'Please contact your administrator to renew access.',
              variant: 'destructive',
            });
          } else {
            console.error('Access forbidden:', data);
          }
          break;
        }

        case 404:
          // Not found
          console.error('Resource not found:', data);
          break;
          
        case 422:
          // Validation error
          console.error('Validation error:', data);
          break;
          
        case 500:
          // Server error
          console.error('Server error:', data);
          break;
          
        default:
          console.error(`HTTP ${status} error:`, data);
      }
    } else if (error.request) {
      // Network error
      console.error('Network error:', error.request);
    } else {
      // Other error
      console.error('Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// Generic API methods
export const apiClient = {
  // GET request
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    return axiosInstance.get(url, config).then(response => response.data);
  },

  // POST request
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    return axiosInstance.post(url, data, config).then(response => response.data);
  },

  // PUT request
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    return axiosInstance.put(url, data, config).then(response => response.data);
  },

  // PATCH request
  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    return axiosInstance.patch(url, data, config).then(response => response.data);
  },

  // DELETE request
  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    return axiosInstance.delete(url, config).then(response => response.data);
  },


  // Download file
  //Note: we will need this once we are geting from blob storage

  download: (url: string, filename?: string, config?: AxiosRequestConfig): Promise<void> => {
    return axiosInstance.get(url, {
      ...config,
      responseType: 'blob',
    }).then(response => {
      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    });
  },
};

// Export the axios instance for custom configurations
export { axiosInstance };

// Export types for better TypeScript support
export type ApiResponse<T = any> = {
  data: T;
  message?: string;
  success: boolean;
  errors?: string[];
};

export type PaginatedResponse<T = any> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  message?: string;
  success: boolean;
};
