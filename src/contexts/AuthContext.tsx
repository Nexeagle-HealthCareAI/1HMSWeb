import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthService } from '@/services/authService';

interface User {
  email?: string;
  mobile?: string;
  // Add more user properties as needed
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithOTP: (mobile: string, otp: string) => Promise<void>;
  sendOTP: (mobile: string) => Promise<{ success: boolean; message: string }>;
  forgotPasswordSendOTP: (mobile: string) => Promise<{ success: boolean; message: string }>;
  resetPassword: (mobile: string, otp: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  checkAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication status on app load
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    const token = AuthService.getAccessToken();
    if (token) {
      setIsAuthenticated(true);
      // You can decode the JWT token here to get user info
      // For now, we'll set a basic user object
      setUser({ email: 'user@example.com' }); // This should be extracted from token
    } else {
      setIsAuthenticated(false);
      setUser(null);
    }
    setIsLoading(false);
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await AuthService.loginWithEmail(email, password);
      
      if (response.success) {
        AuthService.setAccessToken(response.accessToken);
        setIsAuthenticated(true);
        setUser({ email });
        
        // You can decode the JWT token to get more user info
        // const decodedToken = jwt_decode(response.accessToken);
        // setUser(decodedToken);
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      setIsAuthenticated(false);
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithOTP = async (mobile: string, otp: string) => {
    try {
      setIsLoading(true);
      const response = await AuthService.loginWithOTP(mobile, otp);
      
      if (response.success) {
        AuthService.setAccessToken(response.accessToken);
        setIsAuthenticated(true);
        setUser({ mobile });
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      setIsAuthenticated(false);
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const sendOTP = async (mobile: string) => {
    try {
      const response = await AuthService.sendOTP(mobile);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const forgotPasswordSendOTP = async (mobile: string) => {
    try {
      const response = await AuthService.forgotPasswordSendOTP(mobile);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const resetPassword = async (mobile: string, otp: string, newPassword: string) => {
    try {
      const response = await AuthService.resetPassword(mobile, otp, newPassword);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    AuthService.logout();
    setIsAuthenticated(false);
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    loginWithOTP,
    sendOTP,
    forgotPasswordSendOTP,
    resetPassword,
    logout,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
