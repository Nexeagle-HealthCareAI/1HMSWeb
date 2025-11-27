import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError, InternalAxiosRequestConfig, AxiosHeaders } from 'axios';
import { useAuthStore } from '@/store/authStore';
import { API_BASE_URL, DEFAULT_HEADERS, API_ENDPOINTS } from '@/app/api';

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
    }
    
    // Add CSRF token if available
    const csrfToken = localStorage.getItem('csrf-token');
    if (csrfToken && config.headers) {
      config.headers['X-CSRF-Token'] = csrfToken;
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
  API_ENDPOINTS.AUTH.ONBOARDING_REGISTER,
  API_ENDPOINTS.USER_MANAGEMENT.UPDATE_INVITED_USER,
  API_ENDPOINTS.USER_MANAGEMENT.VALIDATE_TOKEN,
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
            // Unauthorized - clear auth and redirect to login for protected endpoints
            useAuthStore.getState().logout();
            window.location.href = '/login';
          }
          break;
          
        case 403:
          // Forbidden - user doesn't have permission
          console.error('Access forbidden:', data);
          break;
          
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
