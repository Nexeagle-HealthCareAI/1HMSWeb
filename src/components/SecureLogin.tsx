import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ValidationUtils } from '@/utils/validation';
import { AuthService } from '@/services/authService';
import { SessionManager } from '@/utils/sessionManager';
import {
  PasswordLoginForm,
  OTPLoginForm,
  ForgotPasswordForm,
  LockedAccountScreen,
  LoginLayout
} from '@/components/login';

interface LoginProps {
  onLogin: () => void;
  onSwitchToRegister: () => void;
}

export const SecureLogin: React.FC<LoginProps> = ({ onLogin, onSwitchToRegister }) => {
  const { login, loginWithOTP, sendOTP, forgotPasswordSendOTP, resetPassword } = useAuth();
  const [loginType, setLoginType] = useState('password');
  
  // Security states
  const [isLoading, setIsLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTimeRemaining, setLockoutTimeRemaining] = useState(0);
  
  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);

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
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    // Validate email/mobile format
    const isEmail = ValidationUtils.isValidEmail(sanitizedUserid);
    const isMobile = ValidationUtils.isValidMobile(sanitizedUserid);
    
    if (!isEmail && !isMobile) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid email or mobile number",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      await login(sanitizedUserid, sanitizedPassword);
      ValidationUtils.clearRateLimit('login_attempts');
      setFailedAttempts(0);
      toast({
        title: "Welcome back!",
        description: "Successfully logged in to NexEagle easyHMS"
      });
      onLogin();
    } catch (error) {
      handleFailedLogin();
      toast({
        title: "Login Failed",
        description: "Invalid credentials. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOTP = async (mobile: string) => {
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

    const sanitizedMobile = ValidationUtils.sanitizeInput(mobile);
    if (!sanitizedMobile || !ValidationUtils.isValidMobile(sanitizedMobile)) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid mobile number",
        variant: "destructive"
      });
      return;
    }

    // Rate limiting for OTP requests
    if (!ValidationUtils.checkRateLimit(`otp_${sanitizedMobile}`, 3, 5 * 60 * 1000)) {
      toast({
        title: "Rate Limit Exceeded",
        description: "Too many OTP requests. Please wait 5 minutes.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Clean mobile number for API
      const cleanMobile = ValidationUtils.cleanMobileNumber(sanitizedMobile);
      await sendOTP(cleanMobile);
      toast({
        title: "OTP Sent!",
        description: "Please check your mobile for the verification code"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send OTP. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (mobile: string, otp: string) => {
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

    const sanitizedMobile = ValidationUtils.sanitizeInput(mobile);
    const sanitizedOtp = ValidationUtils.sanitizeInput(otp);
    
    if (!sanitizedOtp || !ValidationUtils.isValidOTP(sanitizedOtp)) {
      toast({
        title: "Invalid OTP",
        description: "Please enter a valid 6-digit OTP",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Clean mobile number for API
      const cleanMobile = ValidationUtils.cleanMobileNumber(sanitizedMobile);
      await loginWithOTP(cleanMobile, sanitizedOtp);
      ValidationUtils.clearRateLimit(`otp_${sanitizedMobile}`);
      setFailedAttempts(0);
      toast({
        title: "Welcome back!",
        description: "Successfully logged in to NexEagle easyHMS"
      });
      onLogin();
    } catch (error) {
      handleFailedLogin();
      toast({
        title: "Login Failed",
        description: "Invalid OTP. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordSendOTP = async (mobile: string) => {
    console.log('handleForgotPasswordSendOTP called with mobile:', mobile);
    
    const sanitizedMobile = ValidationUtils.sanitizeInput(mobile);
    console.log('Sanitized mobile:', sanitizedMobile);
    
    if (!sanitizedMobile || !ValidationUtils.isValidMobile(sanitizedMobile)) {
      console.log('Mobile validation failed:', { sanitizedMobile, isValid: ValidationUtils.isValidMobile(sanitizedMobile) });
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

    setIsLoading(true);
    try {
      // Clean mobile number for API
      const cleanMobile = ValidationUtils.cleanMobileNumber(sanitizedMobile);
      console.log('Calling forgotPasswordSendOTP with cleaned mobile:', cleanMobile);
      const response = await forgotPasswordSendOTP(cleanMobile);
      console.log('OTP sent successfully');
      console.log('OTP generator response:', response);
      
      // Store userId if returned from OTP generator
      if (response.userId) {
        SessionManager.setUserId(response.userId);
        console.log('UserId stored from OTP generator:', response.userId);
      } else {
        console.warn('No userId returned from OTP generator');
      }
      
      toast({
        title: "OTP Sent!",
        description: "Please check your mobile for the verification code"
      });
    } catch (error) {
      console.error('Error sending OTP:', error);
      toast({
        title: "Error",
        description: "Failed to send OTP. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
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

    setIsLoading(true);
    try {
      // Clean mobile number for API
      const cleanMobile = ValidationUtils.cleanMobileNumber(mobile);
      // Call OTP checker API to verify OTP (userId should already be stored from OTP generator)
      const response = await AuthService.checkOTP(cleanMobile, sanitizedOtp);
      
      console.log('OTP verification response:', response);
      
      if (response.success) {
        // Check if userId is already stored from OTP generator
        const storedUserId = SessionManager.getUserId();
        if (storedUserId) {
          console.log('UserId already stored from OTP generator:', storedUserId);
        } else {
          console.warn('No userId found in session. OTP generator may not have returned userId.');
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
        description: error instanceof Error ? error.message : "Please check your OTP and try again",
        variant: "destructive"
      });
      throw error; // Re-throw to prevent step progression
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordReset = async (mobile: string, otp: string, newPassword: string) => {
    console.log('=== HANDLE FORGOT PASSWORD RESET ===');
    console.log('Mobile:', mobile);
    console.log('OTP:', otp);
    console.log('New Password:', newPassword ? '***' : 'empty');
    
    const sanitizedMobile = ValidationUtils.sanitizeInput(mobile);
    const sanitizedNewPassword = ValidationUtils.sanitizeInput(newPassword);

    console.log('Sanitized mobile:', sanitizedMobile);
    console.log('Sanitized password:', sanitizedNewPassword ? '***' : 'empty');

    setIsLoading(true);
    try {
      console.log('Calling resetPassword...');
      await resetPassword(sanitizedMobile, otp, sanitizedNewPassword);
      console.log('resetPassword completed successfully');
      
      ValidationUtils.clearRateLimit(`forgot_otp_${sanitizedMobile}`);
      // Clear userId from session after successful password reset
      SessionManager.clearToken();
      setShowForgotPassword(false);
      toast({
        title: "Password Reset Successful!",
        description: "You can now login with your new password"
      });
    } catch (error) {
      console.error('Error in handleForgotPasswordReset:', error);
      toast({
        title: "Error",
        description: "Failed to reset password. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
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
          title: "Account Locked",
          description: "Too many failed attempts. Account locked for 1 minute.",
          variant: "destructive"
        });
      }
      
      return newAttempts;
    });
  };

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
      >
        <ForgotPasswordForm
          onSendOTP={handleForgotPasswordSendOTP}
          onVerifyOTP={handleForgotPasswordVerifyOTP}
          onResetPassword={handleForgotPasswordReset}
          onBackToLogin={() => setShowForgotPassword(false)}
          isLoading={isLoading}
        />
      </LoginLayout>
    );
  }

  // Main Login Screen
  return (
    <LoginLayout
      title="NexEagle easyHMS"
      subtitle="Healthcare Management System"
    >
      {loginType === 'password' ? (
        <PasswordLoginForm
          onLogin={handlePasswordLogin}
          onSwitchToOTP={() => setLoginType('otp')}
          onForgotPassword={() => setShowForgotPassword(true)}
          isLoading={isLoading}
          failedAttempts={failedAttempts}
          isLocked={isLocked}
          lockoutTimeRemaining={lockoutTimeRemaining}
        />
      ) : (
        <OTPLoginForm
          onSendOTP={handleSendOTP}
          onVerifyOTP={handleVerifyOTP}
          onSwitchToPassword={() => setLoginType('password')}
          isLoading={isLoading}
          isLocked={isLocked}
          lockoutTimeRemaining={lockoutTimeRemaining}
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
            disabled={isLoading}
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