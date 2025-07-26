// CSRF Protection utilities
export const CSRFProtection = {
  // Generate a CSRF token
  generateToken: (): string => {
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem('csrfToken', token);
    return token;
  },

  // Get current CSRF token
  getToken: (): string | null => {
    return sessionStorage.getItem('csrfToken');
  },

  // Validate CSRF token
  validateToken: (token: string): boolean => {
    const storedToken = sessionStorage.getItem('csrfToken');
    return storedToken === token;
  },

  // Add CSRF token to headers
  addCSRFHeader: (headers: HeadersInit): HeadersInit => {
    const token = CSRFProtection.getToken();
    if (token) {
      return {
        ...headers,
        'X-CSRF-Token': token,
      };
    }
    return headers;
  },

  // Clear CSRF token
  clearToken: (): void => {
    sessionStorage.removeItem('csrfToken');
  }
}; 