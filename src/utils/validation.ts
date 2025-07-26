// Input validation and sanitization utilities
export const ValidationUtils = {
  // Sanitize input to prevent XSS
  sanitizeInput: (input: string): string => {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, ''); // Remove event handlers
  },

  // Validate email format
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Validate mobile number (basic)
  isValidMobile: (mobile: string): boolean => {
    const mobileRegex = /^\+?[\d\s\-\(\)]{10,15}$/;
    return mobileRegex.test(mobile);
  },

  // Validate OTP format
  isValidOTP: (otp: string): boolean => {
    const otpRegex = /^\d{6}$/;
    return otpRegex.test(otp);
  },

  // Password strength validation
  validatePassword: (password: string): {
    isValid: boolean;
    strength: 'weak' | 'medium' | 'strong';
    errors: string[];
  } => {
    const errors: string[] = [];
    let score = 0;

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    } else {
      score += 1;
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    } else {
      score += 1;
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    } else {
      score += 1;
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    } else {
      score += 1;
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    } else {
      score += 1;
    }

    let strength: 'weak' | 'medium' | 'strong' = 'weak';
    if (score >= 4) strength = 'strong';
    else if (score >= 3) strength = 'medium';

    return {
      isValid: errors.length === 0,
      strength,
      errors
    };
  },

  // Rate limiting helper
  checkRateLimit: (key: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean => {
    const now = Date.now();
    const attempts = JSON.parse(localStorage.getItem(`rateLimit_${key}`) || '[]');
    
    // Remove old attempts outside the window
    const validAttempts = attempts.filter((timestamp: number) => now - timestamp < windowMs);
    
    if (validAttempts.length >= maxAttempts) {
      return false; // Rate limit exceeded
    }
    
    // Add current attempt
    validAttempts.push(now);
    localStorage.setItem(`rateLimit_${key}`, JSON.stringify(validAttempts));
    
    return true; // Within rate limit
  },

  // Clear rate limit data
  clearRateLimit: (key: string): void => {
    localStorage.removeItem(`rateLimit_${key}`);
  }
}; 