// Security configuration
export const SecurityConfig = {
  // Password requirements
  PASSWORD: {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SPECIAL_CHARS: true,
    MAX_LENGTH: 128,
  },

  // Rate limiting settings
  RATE_LIMITING: {
    LOGIN_ATTEMPTS: {
      MAX_ATTEMPTS: 5,
      WINDOW_MS: 1 * 60 * 1000, // 15 minutes
    },
    OTP_REQUESTS: {
      MAX_ATTEMPTS: 3,
      WINDOW_MS: 5 * 60 * 1000, // 5 minutes
    },
    PASSWORD_RESET: {
      MAX_ATTEMPTS: 2,
      WINDOW_MS: 10 * 60 * 1000, // 10 minutes
    },
  },

  // Session settings
  SESSION: {
    TOKEN_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
    REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutes before expiry
  },

  // Account lockout settings
  ACCOUNT_LOCKOUT: {
    MAX_FAILED_ATTEMPTS: 5,
    LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
  },

  // Input validation
  VALIDATION: {
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    MOBILE_REGEX: /^\+?[\d\s\-\(\)]{10,15}$/,
    OTP_REGEX: /^\d{6}$/,
    NAME_REGEX: /^[a-zA-Z\s]{2,50}$/,
  },

  // Security headers
  SECURITY_HEADERS: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;",
  },

  // HTTPS enforcement
  HTTPS_ENFORCEMENT: {
    ENABLED: process.env.NODE_ENV === 'production',
    REDIRECT: true,
  },

  // CORS settings
  CORS: {
    ALLOWED_ORIGINS: [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:8080',
      'https://nexeagle.com',
      'https://*.nexeagle.com',
    ],
    ALLOWED_METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    ALLOWED_HEADERS: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    CREDENTIALS: true,
  },
}; 