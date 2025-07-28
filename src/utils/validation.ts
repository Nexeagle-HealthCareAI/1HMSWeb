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
    // Remove all non-digit characters for validation
    const cleanMobile = mobile.replace(/\D/g, '');
    // Check if it's 10-15 digits
    return cleanMobile.length >= 10 && cleanMobile.length <= 15;
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
    
    console.log(`Rate limit check for key "${key}":`, {
      maxAttempts,
      currentAttempts: validAttempts.length,
      windowMs: windowMs / 1000 / 60 + ' minutes',
      isAllowed: validAttempts.length < maxAttempts
    });
    
    if (validAttempts.length >= maxAttempts) {
      console.log(`Rate limit EXCEEDED for key "${key}": ${validAttempts.length}/${maxAttempts} attempts`);
      return false; // Rate limit exceeded
    }
    
    // Add current attempt
    validAttempts.push(now);
    localStorage.setItem(`rateLimit_${key}`, JSON.stringify(validAttempts));
    
    console.log(`Rate limit ALLOWED for key "${key}": ${validAttempts.length}/${maxAttempts} attempts`);
    return true; // Within rate limit
  },

  // Clear rate limit data
  clearRateLimit: (key: string): void => {
    localStorage.removeItem(`rateLimit_${key}`);
    console.log(`Rate limit cleared for key "${key}"`);
  },

  // Debug function to check current rate limit status
  debugRateLimit: (key: string): void => {
    const attempts = JSON.parse(localStorage.getItem(`rateLimit_${key}`) || '[]');
    const now = Date.now();
    const validAttempts = attempts.filter((timestamp: number) => now - timestamp < 1 * 60 * 1000);
    console.log(`Rate limit debug for key "${key}":`, {
      totalAttempts: attempts.length,
      validAttempts: validAttempts.length,
      timestamps: validAttempts.map((ts: number) => new Date(ts).toLocaleTimeString())
    });
  },

  // Clean mobile number for API
  cleanMobileNumber: (mobile: string): string => {
    // Remove all non-digit characters
    return mobile.replace(/\D/g, '');
  },

  // Validate full name
  validateFullName: (name: string): string | undefined => {
    if (!name.trim()) {
      return 'Full name is required';
    }
    if (name.trim().length < 2) {
      return 'Full name must be at least 2 characters';
    }
    if (name.trim().length > 50) {
      return 'Full name must be less than 50 characters';
    }
    if (!/^[a-zA-Z\s]+$/.test(name.trim())) {
      return 'Full name can only contain letters and spaces';
    }
    return undefined;
  },

  // Validate email with error message
  validateEmail: (email: string): string | undefined => {
    if (!email.trim()) {
      return undefined; // Email is optional
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return 'Please enter a valid email address';
    }
    if (email.trim().length > 100) {
      return 'Email must be less than 100 characters';
    }
    return undefined;
  },

  // Validate password with error message
  validatePasswordWithError: (password: string): string | undefined => {
    if (!password.trim()) {
      return undefined; // Password is optional
    }
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (password.length > 128) {
      return 'Password must be less than 128 characters';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/\d/.test(password)) {
      return 'Password must contain at least one number';
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return 'Password must contain at least one special character';
    }
    return undefined;
  }
}; 