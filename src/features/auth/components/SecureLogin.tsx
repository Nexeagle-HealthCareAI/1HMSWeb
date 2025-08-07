import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import { ValidationUtils } from '@/utils/validation';
import { useAuthApi, useInvalidateQueries } from '@/hooks/useApi';
import {
  PasswordLoginForm,
  OTPLoginForm,
  ForgotPasswordForm,
  LockedAccountScreen,
  LoginLayout
} from '@/features/auth/components';
import { PasswordResetSuccessModal } from '@/components/modals';

interface LoginProps {
  onLogin: () => void;
  onSwitchToRegister: () => void;
}

export const SecureLogin: React.FC<LoginProps> = ({ onLogin, onSwitchToRegister }) => {
  const { setUser, setToken } = useAuthStore();
  const { invalidateAuth } = useInvalidateQueries();
  
  // Using useAuthApi for all auth operations
  const loginMutation = useAuthApi.login();
  const sendOTPMutation = useAuthApi.sendOTP();
  const verifyOTPMutation = useAuthApi.verifyOTP();  
  const resetPasswordWithUserIdMutation = useAuthApi.resetPasswordWithUserId();
  
  const [loginType, setLoginType] = useState('password');
  
  // Security states
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTimeRemaining, setLockoutTimeRemaining] = useState(0);
  
  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  
  // Password reset success state
  const [showPasswordResetSuccess, setShowPasswordResetSuccess] = useState(false);

  // Helper function to get user-friendly error messages
  const getErrorMessage = (error: any): string => {
    // If it's already a user-friendly message, return it
    if (error instanceof Error && !error.message.includes('Request failed')) {
      return error.message;
    }

    // Handle Axios errors
    if (error?.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          if (data?.message) {
            return data.message;
          }
          return 'Invalid request. Please check your input and try again.';
        case 401:
          return 'Invalid credentials. Please check your mobile number/email and password.';
        case 403:
          return 'Access denied. You don\'t have permission for this action.';
        case 404:
          return 'User not found. Please check your mobile number/email.';
        case 422:
          if (data?.message) {
            return data.message;
          }
          return 'Validation failed. Please check your input.';
        case 429:
          return 'Too many login attempts. Please wait a moment before trying again.';
        case 500:
          return 'Server error. Please try again later.';
        case 502:
        case 503:
        case 504:
          return 'Service temporarily unavailable. Please try again later.';
        default:
          return 'Something went wrong. Please try again.';
      }
    }

    // Handle network errors
    if (error?.request) {
      return 'Network error. Please check your internet connection and try again.';
    }

    // Handle timeout errors
    if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }

    // Handle generic error messages
    if (error?.message) {
      const message = error.message;
      if (message.includes('Request failed with status code 400')) {
        return 'Invalid request. Please check your input and try again.';
      }
      if (message.includes('Request failed with status code 401')) {
        return 'Invalid credentials. Please check your mobile number/email and password.';
      }
      if (message.includes('Request failed with status code 403')) {
        return 'Access denied. You don\'t have permission for this action.';
      }
      if (message.includes('Request failed with status code 404')) {
        return 'User not found. Please check your mobile number/email.';
      }
      if (message.includes('Request failed with status code 422')) {
        return 'Validation failed. Please check your input.';
      }
      if (message.includes('Request failed with status code 429')) {
        return 'Too many login attempts. Please wait a moment before trying again.';
      }
      if (message.includes('Request failed with status code 500')) {
        return 'Server error. Please try again later.';
      }
      if (message.includes('Request failed with status code')) {
        return 'Something went wrong. Please try again.';
      }
    }

    // Default fallback
    return 'Something went wrong. Please try again.';
  };

  // Check for account lockout and handle countdown
  useEffect(() => {
    const lockoutUntil = localStorage.getItem('accountLockout');
    if (lockoutUntil && Date.now() < parseInt(lockoutUntil)) {
      setIsLocked(true);
      const remainingTime = Math.ceil((parseInt(lockoutUntil) - Date.now()) / 1000);
      setLockoutTimeRemaining(remainingTime);
      
      if (remainingTime > 0) {
        toast({
          title: "Account Temporarily Locked",
          description: `Too many failed attempts. Try again in ${Math.ceil(remainingTime / 60)} minutes.`,
          variant: "destructive"
        });
      }
    } else {
      // Clear lockout if expired
      localStorage.removeItem('accountLockout');
      setIsLocked(false);
      setLockoutTimeRemaining(0);
      setFailedAttempts(0);
    }
  }, []);

  // Countdown timer for lockout
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isLocked && lockoutTimeRemaining > 0) {
      interval = setInterval(() => {
        setLockoutTimeRemaining(prev => {
          if (prev <= 1) {
            // Lockout expired
            localStorage.removeItem('accountLockout');
            setIsLocked(false);
            setFailedAttempts(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isLocked, lockoutTimeRemaining]);

  // Handler functions for child components
  const handlePasswordLogin = async (userid: string, password: string) => {
    if (isLocked) {
      const minutes = Math.floor(lockoutTimeRemaining / 60);
      const seconds = lockoutTimeRemaining % 60;
      toast({
        title: "Account Locked",
        description: `Too many failed attempts. Please try again in ${minutes}:${seconds.toString().padStart(2, '0')}`,
        variant: "destructive"
      });
      return;
    }

    const sanitizedUserid = ValidationUtils.sanitizeInput(userid);
    const sanitizedPassword = ValidationUtils.sanitizeInput(password);

    if (!sanitizedUserid || !sanitizedPassword) {
      toast({
        title: "Invalid Input",
        description: "Please enter valid credentials",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await loginMutation.mutateAsync({
        isLoginWithOtp: false,
        emailOrPhone: sanitizedUserid,
        password: sanitizedPassword,
        otp: ''
      });
      
      if (response.success) {
        // Update auth store
        setToken(response.accessToken!);
        setUser({
          id: response.userId || undefined,
          email: sanitizedUserid,
          mobile: sanitizedUserid,
          name: sanitizedUserid,
        });

        // Invalidate and refetch auth data
        invalidateAuth();

        toast({
          title: "Login Successful",
          description: "Welcome back!"
        });
        onLogin();
      } else {
        handleFailedLogin();
      }
    } catch (error) {
      console.error('Login error:', error);
      
      toast({
        title: "❌ Login Failed",
        description: getErrorMessage(error),
        variant: "destructive",
        duration: 5000,
      });
      
      handleFailedLogin();
    }
  };

  const handleSendOTP = async (mobile: string) => {
    const sanitizedMobile = ValidationUtils.sanitizeInput(mobile);
    
    if (!sanitizedMobile) {
      toast({
        title: "Invalid Mobile",
        description: "Please enter a valid mobile number",
        variant: "destructive"
      });
      return;
    }

    // Clean mobile number for API (remove non-digit characters)
    const cleanMobile = ValidationUtils.cleanMobileNumber(mobile);

    try {
      const response = await sendOTPMutation.mutateAsync({ mobileNumber: cleanMobile });
      
      if (response.success) {
        toast({
          title: "OTP Sent",
          description: "Please check your mobile for the verification code"
        });
      } else {
        throw new Error(response.message || 'Failed to send OTP');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive"
      });
    }
  };

  const handleVerifyOTP = async (mobile: string, otp: string) => {
    const sanitizedMobile = ValidationUtils.sanitizeInput(mobile);
    const sanitizedOtp = ValidationUtils.sanitizeInput(otp);

    if (!sanitizedMobile || !sanitizedOtp) {
      toast({
        title: "Invalid Input",
        description: "Please enter valid mobile and OTP",
        variant: "destructive"
      });
      return;
    }

    if (sanitizedOtp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter a valid 6-digit OTP",
        variant: "destructive"
      });
      return;
    }

    try {
      // Clean mobile number for API
      const cleanMobile = ValidationUtils.cleanMobileNumber(mobile);
      // Call OTP checker API to verify OTP (userId should already be stored from OTP generator)
      const response = await verifyOTPMutation.mutateAsync({
        mobileNumber: cleanMobile,
        otp: sanitizedOtp
      });
      
      console.log('OTP verification response:', response);
      
      if (response.success) {
        // Store userId from OTP verification response
        if (response.userId) {
          useAuthStore.getState().setUserId(response.userId);
        }
        
        // For OTP login, check if we have userId from the response
        const storedUserId = response.userId || useAuthStore.getState().getUserId();
        
        if (storedUserId) {
          // For OTP login, we need to set the user as authenticated
          // Since OTP verification is successful, we can authenticate the user
          useAuthStore.getState().setAuthenticatedUser(storedUserId, 'Admin', 'otp-login');
          
          toast({
            title: "Login Successful",
            description: "Welcome back!"
          });
          onLogin();
        } else {
          toast({
            title: "OTP Verification Failed",
            description: "User ID not found. Please try again."
          });
        }
      } else {
        throw new Error(response.message || 'OTP verification failed');
      }
    } catch (error) {
      toast({
        title: "OTP Verification Failed",
        description: getErrorMessage(error),
        variant: "destructive"
      });
      throw error; // Re-throw to prevent step progression
    }
  };

  const handleForgotPasswordSendOTP = async (mobile: string) => {    
    const sanitizedMobile = ValidationUtils.sanitizeInput(mobile);    
    
    if (!sanitizedMobile || !ValidationUtils.isValidMobile(sanitizedMobile)) {      
      toast({
        title: "Invalid Input",
        description: "Please enter a valid mobile number",
        variant: "destructive"
      });
      return;
    }

    // Rate limiting for forgot password OTP
    if (!ValidationUtils.checkRateLimit(`forgot_otp_${sanitizedMobile}`, 2, 1 * 60 * 1000)) {
      console.log('Rate limit exceeded for mobile:', sanitizedMobile);
      toast({
        title: "Rate Limit Exceeded",
        description: "Too many password reset requests. Please wait 1 minute.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Clean mobile number for API
      const cleanMobile = ValidationUtils.cleanMobileNumber(sanitizedMobile);
      
      // Use sendOTP API for forgot password
      const response = await sendOTPMutation.mutateAsync({ mobileNumber: cleanMobile });      
      
      console.log('Send OTP response:', response);
      
      // Store userId if returned from OTP generator
      if (response.success && response.userId) {
        useAuthStore.getState().setUserId(response.userId);
        console.log('OTP sent successfully, userId stored:', response.userId);
      } else {
        console.warn('OTP send failed or no userId returned');
        console.log('Response structure:', response);
      }
      
      toast({
        title: "OTP Sent!",
        description: "Please check your mobile for the verification code"
      });
    } catch (error) {
      console.error('Error sending OTP:', error);
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive"
      });
    }
  };

  const handleForgotPasswordVerifyOTP = async (mobile: string, otp: string) => {
    const sanitizedOtp = ValidationUtils.sanitizeInput(otp);
    if (!sanitizedOtp || !ValidationUtils.isValidOTP(sanitizedOtp)) {
      toast({
        title: "Invalid OTP",
        description: "Please enter a valid 6-digit OTP",
        variant: "destructive"
      });
      return;
    }

    try {
      // Clean mobile number for API
      const cleanMobile = ValidationUtils.cleanMobileNumber(mobile);
      // Call OTP checker API to verify OTP (userId should already be stored from OTP generator)
      const response = await verifyOTPMutation.mutateAsync({
        mobileNumber: cleanMobile,
        otp: sanitizedOtp
      });
      
      console.log('OTP verification response:', response);
      
      if (response.success) {
        // Store userId from OTP verification response if available
        if (response.userId) {
          useAuthStore.getState().setUserId(response.userId);
          console.log('UserId stored from OTP verification:', response.userId);
        }
        
        // Store access token if available for password reset
        if (response.accessToken) {
          useAuthStore.getState().setToken(response.accessToken);
          console.log('Access token stored from OTP verification for password reset');
        }
        
        // Check if userId is stored (either from send OTP or verify OTP)
        const storedUserId = useAuthStore.getState().getUserId();
        if (storedUserId) {
          console.log('UserId available for password reset:', storedUserId);
        } else {
          console.warn('No userId found in session. Please try the process again.');
        }
        
        toast({
          title: "OTP Verified",
          description: "Please enter your new password"
        });
      } else {
        throw new Error(response.message || 'OTP verification failed');
      }
    } catch (error) {
      toast({
        title: "OTP Verification Failed",
        description: getErrorMessage(error),
        variant: "destructive"
      });
      throw error; // Re-throw to prevent step progression
    }
  };

  const handleForgotPasswordReset = async (mobile: string, otp: string, newPassword: string) => {
    
    const sanitizedMobile = ValidationUtils.sanitizeInput(mobile);
    const sanitizedNewPassword = ValidationUtils.sanitizeInput(newPassword);   

    try {
      // Get stored userId from auth store
      const storedUserId = useAuthStore.getState().getUserId();
      console.log('Attempting password reset with userId:', storedUserId);
      
      if (!storedUserId) {
        console.error('No userId found in auth store for password reset');
        toast({
          title: "Error",
          description: "User ID not found. Please try the forgot password process again.",
          variant: "destructive"
        });
        return;
      }

      // Check if we have a token for the PATCH call
      const currentToken = useAuthStore.getState().getToken();
      console.log('Current token for password reset:', currentToken ? 'Available' : 'Not available');

      // Use the new reset password API with userId
      const response = await resetPasswordWithUserIdMutation.mutateAsync({
        userId: storedUserId,
        email: sanitizedMobile, // Using mobile as email for now
        password: sanitizedNewPassword
      });
      
      if (response.success) {
        ValidationUtils.clearRateLimit(`forgot_otp_${sanitizedMobile}`);
        // Clear userId from session after successful password reset
        const authStore = useAuthStore.getState();
        authStore.clearToken();
        authStore.setUserId('');
        
        // Show success popup instead of immediate redirect
        setShowPasswordResetSuccess(true);
      } else {
        throw new Error(response.message || 'Password reset failed');
      }
    } catch (error) {
      console.error('Error in handleForgotPasswordReset:', error);
      toast({
        title: "❌ Password Reset Failed",
        description: getErrorMessage(error),
        variant: "destructive",
        duration: 5000,
      });
      
      // Ensure user stays in forgot password flow - DO NOT redirect
      // The user will remain on step 3 (password reset form) to try again
      console.log('Password reset failed - user remains in forgot password flow');
    }
  };

  const handlePasswordResetSuccessLogin = () => {
    setShowPasswordResetSuccess(false);
    setShowForgotPassword(false);
    // User will be redirected to login form
  };

  const handlePasswordResetSuccessCancel = () => {
    setShowPasswordResetSuccess(false);
    // Stay in forgot password flow to allow user to reset password again
  };

  const handleFailedLogin = () => {
    setFailedAttempts(prev => {
      const newAttempts = prev + 1;
      
      // Lock account after 5 failed attempts for 1 minute
      if (newAttempts >= 5) {
        const lockoutUntil = Date.now() + (1 * 60 * 1000); // 1 minute lockout
        localStorage.setItem('accountLockout', lockoutUntil.toString());
        setIsLocked(true);
        setLockoutTimeRemaining(60); // 60 seconds
        
        toast({
          title: "🔒 Account Locked",
          description: "Too many failed attempts. Account locked for 1 minute.",
          variant: "destructive",
          duration: 10000, // Show for 10 seconds
        });
      }
      
      return newAttempts;
    });
  };

  // Password Reset Success Popup
  if (showPasswordResetSuccess) {
    return (
      <PasswordResetSuccessModal
        onLogin={handlePasswordResetSuccessLogin}
        onResetAnother={handlePasswordResetSuccessCancel}
      />
    );
  }

  // Show security warning if account is locked
  if (isLocked) {
    return (
      <LockedAccountScreen
        lockoutTimeRemaining={lockoutTimeRemaining}
        isLocked={isLocked}
      />
    );
  }

  // Forgot Password Screen
  if (showForgotPassword) {
    const forgotPasswordPromotionalContent = (
      <div className="text-white max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <img 
            src="/Images/77834bc6-d9bc-41d2-8676-026af7cf79bc.png" 
            alt="Company Logo" 
            className="h-12 w-12" 
            style={{ width: '48px', height: '48px' }} 
          />
          <h1 className="text-3xl font-bold">Secure Recovery</h1>
        </div>
        
        <h2 className="text-xl font-semibold mb-4">
          Your Account Security Matters
        </h2>
        
        <p className="text-lg opacity-90 mb-6 leading-relaxed">
          We use advanced OTP verification to ensure your account remains secure 
          while providing quick password recovery.
        </p>
      </div>
    );

    return (
      <LoginLayout
        title="Reset Password"
        subtitle="Secure password recovery"
        promotionalContent={forgotPasswordPromotionalContent}        
        loadingMessage="Resetting password..."
      >
        <ForgotPasswordForm
          onSendOTP={handleForgotPasswordSendOTP}
          onVerifyOTP={handleForgotPasswordVerifyOTP}
          onResetPassword={handleForgotPasswordReset}
          onBackToLogin={() => setShowForgotPassword(false)}
          isLoading={verifyOTPMutation.isPending}
        />
      </LoginLayout>
    );
  }

  // Main Login Screen
  return (
    <LoginLayout
      title="NexEagle easyHMS"
      subtitle="Healthcare Management System"
      isLoading={loginMutation.isPending}
      loadingMessage="Signing you in..."
    >
      {loginType === 'password' ? (
        <PasswordLoginForm
          onLogin={handlePasswordLogin}
          onSwitchToOTP={() => setLoginType('otp')}
          onForgotPassword={() => setShowForgotPassword(true)}
          isLoading={loginMutation.isPending}
          failedAttempts={failedAttempts}
          isLocked={isLocked}
        />
      ) : (
        <OTPLoginForm
          onSendOTP={handleSendOTP}
          onVerifyOTP={handleVerifyOTP}
          onSwitchToPassword={() => setLoginType('password')}
          isLoading={sendOTPMutation.isPending || verifyOTPMutation.isPending}
          isLocked={isLocked}
        />
      )}
      
      {/* Register Now Button - Compact */}
      <div className="mt-6 pt-4 border-t border-border">
        <div className="text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Don't have an account yet?
          </p>
          <Button
            onClick={onSwitchToRegister}
            className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 text-white font-bold text-base rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
            disabled={loginMutation.isPending || sendOTPMutation.isPending || verifyOTPMutation.isPending }
          >
            🚀 Register Now
          </Button>
          <p className="text-xs text-muted-foreground/80 px-2">
            Free account • Setup in 2 minutes • Start managing patients today
          </p>
        </div>
      </div>
    </LoginLayout>
  );
}; 