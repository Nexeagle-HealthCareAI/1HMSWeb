// Secure session management utilities
export const SessionManager = {
  // Store token in sessionStorage (more secure than localStorage for sensitive data)
  setToken: (token: string): void => {
    try {
      sessionStorage.setItem('accessToken', token);
      // Set token expiry (e.g., 24 hours)
      const expiry = Date.now() + (24 * 60 * 60 * 1000);
      sessionStorage.setItem('tokenExpiry', expiry.toString());
    } catch (error) {
      console.error('Failed to store token:', error);
    }
  },

  // Get token from sessionStorage
  getToken: (): string | null => {
    try {
      const token = sessionStorage.getItem('accessToken');
      const expiry = sessionStorage.getItem('tokenExpiry');
      
      if (!token || !expiry) {
        return null;
      }

      // Check if token has expired
      if (Date.now() > parseInt(expiry)) {
        SessionManager.clearToken();
        return null;
      }

      return token;
    } catch (error) {
      console.error('Failed to retrieve token:', error);
      return null;
    }
  },

  // Clear token and session data
  clearToken: (): void => {
    try {
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('tokenExpiry');
      sessionStorage.removeItem('user');
      
      // Also clear localStorage items
      localStorage.removeItem('easyHMS_loggedIn');
      localStorage.removeItem('easyHMS_userRole');
    } catch (error) {
      console.error('Failed to clear token:', error);
    }
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    return SessionManager.getToken() !== null;
  },

  // Store user data securely
  setUser: (userData: any): void => {
    try {
      // Only store non-sensitive user data
      const safeUserData = {
        id: userData.id,
        email: userData.email,
        mobile: userData.mobile,
        role: userData.role,
        name: userData.name
      };
      sessionStorage.setItem('user', JSON.stringify(safeUserData));
    } catch (error) {
      console.error('Failed to store user data:', error);
    }
  },

  // Get user data
  getUser: (): any => {
    try {
      const userData = sessionStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Failed to retrieve user data:', error);
      return null;
    }
  },

  // Clear all session data
  clearSession: (): void => {
    try {
      // Clear all sessionStorage
      sessionStorage.clear();
      
      // Clear all localStorage authentication-related items
      const authKeys = [
        'easyHMS_loggedIn',
        'easyHMS_userRole',
        'accountLockout',
        'csrf_token',
        'csrf_token_expiry'
      ];
      
      authKeys.forEach(key => {
        localStorage.removeItem(key);
      });
      
      // Clear rate limiting data
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('rateLimit_') || 
            key.startsWith('otp_') || 
            key.startsWith('forgot_otp_') ||
            key.startsWith('resend_otp_') ||
            key.startsWith('resend_forgot_otp_') ||
            key.startsWith('login_attempts')) {
          localStorage.removeItem(key);
        }
      });
      
      // Clear any cookies that might be set
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      });
      
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }
}; 