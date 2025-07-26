import { SessionManager } from './sessionManager';
import { CSRFProtection } from './csrfProtection';
import { SecurityConfig } from '@/config/security';

// HTTP Interceptor for security and token management
export class HttpInterceptor {
  private static isRefreshing = false;
  private static failedQueue: Array<{
    resolve: (value: any) => void;
    reject: (reason: any) => void;
  }> = [];

  // Process failed requests queue
  private static processQueue(error: any, token: string | null = null) {
    HttpInterceptor.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });
    HttpInterceptor.failedQueue = [];
  }

  // Add security headers to request
  static addSecurityHeaders(headers: HeadersInit): HeadersInit {
    const securityHeaders = {
      ...headers,
      ...SecurityConfig.SECURITY_HEADERS,
    };

    // Add CSRF token
    return CSRFProtection.addCSRFHeader(securityHeaders);
  }

  // Handle token refresh
  static async handleTokenRefresh(): Promise<string | null> {
    if (HttpInterceptor.isRefreshing) {
      return new Promise((resolve, reject) => {
        HttpInterceptor.failedQueue.push({ resolve, reject });
      });
    }

    HttpInterceptor.isRefreshing = true;

    try {
      // Check if token is about to expire
      const token = SessionManager.getToken();
      if (!token) {
        throw new Error('No token available');
      }

      // For now, we'll just return the current token
      // In a real implementation, you would call a refresh endpoint
      const refreshedToken = token;
      SessionManager.setToken(refreshedToken);
      
      HttpInterceptor.processQueue(null, refreshedToken);
      return refreshedToken;
    } catch (error) {
      HttpInterceptor.processQueue(error, null);
      SessionManager.clearSession();
      window.location.href = '/';
      throw error;
    } finally {
      HttpInterceptor.isRefreshing = false;
    }
  }

  // Intercept request
  static async interceptRequest(url: string, options: RequestInit): Promise<RequestInit> {
    const token = SessionManager.getToken();
    
    // Add authorization header if token exists
    if (token) {
      options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
      };
    }

    // Add security headers
    options.headers = HttpInterceptor.addSecurityHeaders(options.headers);

    return options;
  }

  // Intercept response
  static async interceptResponse(response: Response): Promise<Response> {
    // Handle 401 Unauthorized
    if (response.status === 401) {
      try {
        await HttpInterceptor.handleTokenRefresh();
        // Retry the original request
        // This would require storing the original request details
        return response;
      } catch (error) {
        // Redirect to login
        SessionManager.clearSession();
        window.location.href = '/';
        throw error;
      }
    }

    // Handle 403 Forbidden
    if (response.status === 403) {
      console.error('Access forbidden');
      throw new Error('Access denied');
    }

    // Handle 429 Too Many Requests
    if (response.status === 429) {
      console.error('Rate limit exceeded');
      throw new Error('Too many requests. Please try again later.');
    }

    return response;
  }

  // Secure fetch wrapper
  static async secureFetch(url: string, options: RequestInit = {}): Promise<Response> {
    try {
      // Intercept request
      const interceptedOptions = await HttpInterceptor.interceptRequest(url, options);
      
      // Make the request
      const response = await fetch(url, interceptedOptions);
      
      // Intercept response
      return await HttpInterceptor.interceptResponse(response);
    } catch (error) {
      console.error('Request failed:', error);
      throw error;
    }
  }
} 