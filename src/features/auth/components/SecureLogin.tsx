import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import { ValidationUtils } from '@/utils/validation';
import { useAuthApi, useInvalidateQueries } from '@/hooks/useApi';
import { fetchAndStoreUserPermissions } from '@/features/auth/services/authApi';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import {
  PasswordLoginForm,
  OTPLoginForm,
  ForgotPasswordForm,
  LockedAccountScreen,
  LoginLayout
} from '@/features/auth/components';
import { PasswordResetSuccessModal } from '@/components/modals';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Building2, AlertCircle, ArrowRight, X, Download } from 'lucide-react';
import { HospitalBrandingModal } from '@/features/hospital/components/HospitalBrandingModal';
import { hospitalApi } from '@/features/hospital/services/hospitalApi';
import { API_ENDPOINTS } from '@/app/api';
import { axiosInstance } from '@/services/axiosClient';

interface LoginProps {
  onLogin: () => void;
  onSwitchToRegister: () => void;
}

export const SecureLogin: React.FC<LoginProps> = ({ onLogin, onSwitchToRegister }) => {
  const { setUser, setToken } = useAuthStore();
  const { invalidateAuth } = useInvalidateQueries();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

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

  const [showHospitalMapping404, setShowHospitalMapping404] = useState(false);
  const [showHospitalBrandingModal, setShowHospitalBrandingModal] = useState(false);
  const [hospitalSelectionError, setHospitalSelectionError] = useState<string | null>(null);

  const { isInstallable, promptInstall } = useInstallPrompt();

  // Reset form and validation errors when switching login type
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
          return t('auth.login.genericError');
        case 401:
          return t('auth.login.invalidCredentials');
        case 403:
          return t('errors.unauthorized');
        case 404:
          return t('auth.login.userNotFound');
        case 422:
          if (data?.message) {
            return data.message;
          }
          return t('errors.validation');
        case 429:
          return t('auth.login.tooManyAttempts');
        case 500:
          return t('auth.login.serverError');
        case 502:
        case 503:
        case 504:
          return t('errors.serverError');
        default:
          return t('auth.login.genericError');
      }
    }

    // Handle network errors
    if (error?.request) {
      return t('auth.login.networkError');
    }

    // Handle timeout errors
    if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
      return t('auth.login.timeoutError');
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
  const fetchAndStoreHospitalMapping = async (userId: string): Promise<'found' | 'not_registered' | 'error'> => {
    const authStore = useAuthStore.getState();
    authStore.setHospitalId(null);
    authStore.setEmployeeId(null);
    authStore.setHospitalAccessRestriction(false, null);

    queryClient.removeQueries({ queryKey: ['hospitalUserByUserId'] });
    queryClient.removeQueries({ queryKey: ['hospital'] });

    try {
      const response = await axiosInstance.get(API_ENDPOINTS.HOSPITALS.GET_BY_USER_ID(userId), {
        validateStatus: (status) => !!status && [200, 204, 404].includes(status),
      });

      const statusCode = response.status || 0;
      const data = response.data as Record<string, any> | undefined;
      const message = typeof data?.message === 'string' ? data.message : undefined;
      const normalizedMessage = message?.toLowerCase() || '';

      if (statusCode === 204) {
        authStore.setHospitalAccessRestriction(true, message || 'Complete hospital information to unlock full access.');
        setShowHospitalMapping404(false);
        return 'not_registered';
      }

      if (statusCode === 200) {
        const hospitalId = data?.hospitalId ?? data?.hospitalID ?? null;
        const employeeId = data?.employeeID ?? data?.employeeId ?? null;

        if (!hospitalId || normalizedMessage.includes('not registered')) {
          authStore.setHospitalAccessRestriction(true, message || 'Hospital not registered. Complete mandatory information to get full access.');
          return 'not_registered';
        }

        authStore.setHospitalId(hospitalId);
        // Populate the full hospital list for the switcher (multi-hospital chains). Non-blocking.
        try {
          const mine = await hospitalApi.getMyHospitals();
          if (mine.length) {
            authStore.setHospitals(mine);
            // Prefer the primary as the active hospital when available.
            const primary = mine.find(h => h.isPrimary) ?? mine[0];
            if (primary?.hospitalId) authStore.setHospitalId(primary.hospitalId);
          }
        } catch { /* non-blocking — single-hospital flow still works */ }
        if (employeeId) {
          authStore.setEmployeeId(employeeId);
        }

        authStore.setHospitalAccessRestriction(false, null);
        setShowHospitalMapping404(false);
        return 'found';
      }

      if (statusCode === 404) {
        authStore.setHospitalAccessRestriction(true, message || 'Hospital mapping not found. Complete hospital information to unlock full access.');
        const userRole = authStore.getUserRole();
        if (userRole === 'Admin' || userRole === 'AdminDoctor') {
          setShowHospitalMapping404(true);
        }
        return 'not_registered';
      }

      authStore.setHospitalAccessRestriction(true, message || 'Unexpected hospital mapping response.');
      return 'error';
    } catch (error: any) {
      const statusCode = error?.response?.status ?? error?.response?.statusCode;
      const message = error?.response?.data?.message || error?.message || 'Failed to fetch hospital mapping.';
      authStore.setHospitalAccessRestriction(true, message);
      setShowHospitalMapping404(false);

      if (statusCode === 404) {
        const userRole = authStore.getUserRole();
        if (userRole === 'Admin' || userRole === 'AdminDoctor') {
          setShowHospitalMapping404(true);
        }
        return 'not_registered';
      }

      console.warn('Hospital mapping fetch failed:', error);
      return 'error';
    }
  };


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
        // Clear any existing auth data first to prevent stale data
        const authStore = useAuthStore.getState();
        authStore.clearSession();

        // Set the token first (needed by the interceptor for every call below) but deliberately
        // hold off on setUser() — which flips isAuthenticated to true — until ALL of
        // permissions/hospital-mapping/doctor-profile have resolved. LoginPage's auto-redirect
        // effect and RouteGuard/RoleBasedRedirect react to isAuthenticated alone; if it goes true
        // while any of that data is still being fetched, they can treat the incomplete state as
        // invalid and force a logout + redirect back to /login mid-flight — which is what was
        // happening (first with userRole, then again with hospitalId once that gap was closed).
        setToken(response.accessToken!);

        if (response.userId && response.accessToken) {
          try {
            await fetchAndStoreUserPermissions(response.userId, response.accessToken);
          } catch (error) {
            console.warn('Failed to fetch permissions:', error);
          }
        }

        let hospitalResult: 'found' | 'not_registered' | 'error' = 'error';

        if (response.userId) {
          hospitalResult = await fetchAndStoreHospitalMapping(response.userId);

          if (hospitalResult === 'found') {
            try {
              const { doctorApi } = await import('@/features/doctor/services/doctorApi');
              await doctorApi.getDoctorProfile(response.userId);
            } catch (doctorError: any) {
              if (doctorError?.response?.status === 404) {
                console.warn('Doctor profile not found (404):', doctorError);
              } else {
                console.warn('Doctor profile fetch failed (non-blocking):', doctorError);
              }
            }
          } else {
            console.info('Hospital information incomplete; skipping doctor profile fetch.');
          }
        }

        // Only now — once role, hospital mapping, and doctor profile have all settled — flip
        // isAuthenticated, so nothing downstream ever observes a partially-authenticated state.
        setUser({
          id: response.userId || undefined,
          email: sanitizedUserid,
          mobile: sanitizedUserid,
          name: sanitizedUserid,
        });

        invalidateAuth();

        toast({
          title: "Login Successful",
          description: hospitalResult === 'found'
            ? "Welcome back!"
            : "Welcome back! Complete your hospital information for full access.",
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

  // Deliberately throws (rather than swallowing) on every path where no OTP was actually
  // generated, and only resolves normally when one was — OTPLoginForm's handleSendOTP awaits
  // this and only advances to the OTP-entry screen when it resolves, so a rejection here is what
  // keeps the user on the mobile-entry step instead of showing an entry screen for a code that
  // can never arrive. A generated-but-undelivered OTP (WhatsApp/Email both failed) still counts
  // as success here: it's saved server-side and retrievable for support, so the user should still
  // reach the OTP-entry screen for that case.
  const handleSendOTP = async (mobile: string) => {
    const sanitizedMobile = ValidationUtils.sanitizeInput(mobile);

    if (!sanitizedMobile) {
      toast({
        title: "Invalid Mobile",
        description: "Please enter a valid mobile number",
        variant: "destructive"
      });
      throw new Error('Invalid mobile number');
    }

    // Clean mobile number for API (remove non-digit characters)
    const cleanMobile = ValidationUtils.cleanMobileNumber(mobile);

    let response;
    try {
      response = await sendOTPMutation.mutateAsync({ mobileNumber: cleanMobile });
    } catch (error) {
      // Genuine network/API-level failure — no OTP was generated either way.
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive"
      });
      throw error;
    }

    if (!response.success) {
      // No OTP was generated at all (e.g. mobile number not registered) — nothing to verify, so
      // stay on the mobile-entry step instead of moving to an OTP screen that can never succeed.
      toast({
        title: "Not Registered",
        description: response.message || "This mobile number is not registered.",
        variant: "destructive"
      });
      throw new Error(response.message || 'Failed to send OTP');
    }

    // Backend still returns success=true even when both WhatsApp and Email delivery fail (the
    // OTP is generated/stored regardless, so support can retrieve it) — check the delivery
    // flags, not just success, or a total delivery failure looks identical to a real send.
    if (response.isWhatsappSent || response.isEmailSent) {
      toast({
        title: "OTP Sent",
        description: "Please check your mobile for the verification code"
      });
    } else {
      toast({
        title: "Couldn't deliver the verification code",
        description: response.message || "We couldn't send the OTP via WhatsApp or Email. Please try again or contact support.",
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
      // Call login API with OTP string to verify & login
      const response = await loginMutation.mutateAsync({
        isLoginWithOtp: true,
        emailOrPhone: cleanMobile,
        password: '',
        otp: sanitizedOtp
      });



      if (response.success) {
        // For OTP login, check if we have userId from the response
        const storedUserId = response.userId || useAuthStore.getState().getUserId();

        if (storedUserId) {
          // Clear any existing auth data first to prevent stale data
          const authStore = useAuthStore.getState();
          authStore.clearSession();

          // Set token + userId, but deliberately hold off on setUser() (which flips
          // isAuthenticated to true) until ALL of permissions/hospital-mapping/doctor-profile
          // have resolved — see the identical comment in handlePasswordLogin above for why:
          // LoginPage's auto-redirect effect and RouteGuard/RoleBasedRedirect react to
          // isAuthenticated alone, and treat any incomplete state as invalid, forcing a
          // premature logout + redirect to /login mid-flight.
          const tokenToUse = response.accessToken || 'otp-login';
          authStore.setToken(tokenToUse);
          authStore.setUserId(storedUserId);

          if (response.accessToken) {
            try {
              await fetchAndStoreUserPermissions(storedUserId, response.accessToken);
            } catch (error) {
              console.warn('Failed to fetch permissions:', error);
            }
          }

          const hospitalResult = await fetchAndStoreHospitalMapping(storedUserId);

          if (hospitalResult === 'found') {
            try {
              const { doctorApi } = await import('@/features/doctor/services/doctorApi');
              await doctorApi.getDoctorProfile(storedUserId);
            } catch (doctorError: any) {
              if (doctorError?.response?.status === 404) {
                console.warn('Doctor profile not found (404):', doctorError);
              } else {
                console.warn('Doctor profile fetch failed (non-blocking):', doctorError);
              }
            }
          } else {
            console.info('Hospital information incomplete; skipping doctor profile fetch.');
          }

          // Only now — once role, hospital mapping, and doctor profile have all settled — flip
          // isAuthenticated, so nothing downstream ever observes a partially-authenticated state.
          authStore.setUser({ id: storedUserId });

          toast({
            title: "Login Successful",
            description: hospitalResult === 'found'
              ? "Welcome back!"
              : "Welcome back! Complete your hospital information for full access.",
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

      // Backend still returns success=true even when both WhatsApp and Email delivery fail (the
      // OTP is generated/stored regardless, so support can retrieve it) — check the delivery
      // flags, not just success, or a total delivery failure looks identical to a real send.
      if (response.success && (response.isWhatsappSent || response.isEmailSent)) {
        toast({
          title: "OTP Sent!",
          description: "Please check your mobile for the verification code"
        });
      } else {
        toast({
          title: "Couldn't deliver the verification code",
          description: response.message || "We couldn't send the OTP via WhatsApp or Email. Please try again or contact support.",
          variant: "destructive"
        });
      }
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

  // Hospital Branding Modal - Show when user clicks "Complete Info" from 404 modal
  if (showHospitalBrandingModal) {
    return (
      <HospitalBrandingModal
        isOpen={showHospitalBrandingModal}
        onClose={() => {
          setShowHospitalBrandingModal(false);
          setShowHospitalMapping404(false);
        }}
        onComplete={() => {
          // After hospital is created, refresh the mapping
          const userId = useAuthStore.getState().getUserId();
          if (userId) {
            fetchAndStoreHospitalMapping(userId).then(() => {
              setShowHospitalBrandingModal(false);
              setShowHospitalMapping404(false);
            });
          }
        }}
      />
    );
  }

  // Full-screen 404 Modal - Blocks all features
  if (showHospitalMapping404) {
    return (
      <Dialog open={showHospitalMapping404} onOpenChange={() => { }}>
        <DialogContent
          className="max-w-2xl p-0 gap-0 overflow-hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <div className="bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 dark:from-red-950/20 dark:via-orange-950/20 dark:to-amber-950/20 p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full flex-shrink-0">
                <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-red-900 dark:text-red-100 mb-2">
                  Hospital Information Required
                </h2>
                <p className="text-red-700 dark:text-red-300 text-base leading-relaxed">
                  Your account is not associated with a hospital yet. Please complete your hospital information to continue using the system.
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg p-6 mb-6 border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-3 mb-4">
                <Building2 className="h-6 w-6 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">What's Next?</h3>
              </div>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold mt-0.5">•</span>
                  <span>Complete your hospital branding and registration details</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold mt-0.5">•</span>
                  <span>Set up your hospital profile with contact and location information</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold mt-0.5">•</span>
                  <span>Configure your hospital settings and preferences</span>
                </li>
              </ul>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                onClick={() => {
                  setShowHospitalMapping404(false);
                  setShowHospitalBrandingModal(true);
                }}
                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-semibold px-8 py-3 text-base shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Complete Hospital Information
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

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
          <h1 className="text-3xl font-bold">{t('auth.resetPasswordTitle')}</h1>
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
      title="NexEagle 1HMS"

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
            disabled={loginMutation.isPending || sendOTPMutation.isPending || verifyOTPMutation.isPending}
          >
            Register Now
          </Button>
          <p className="text-xs text-muted-foreground/80 px-2">
            Free account • Setup in 2 minutes • Start managing patients today
          </p>
        </div>
      </div>

      {isInstallable && (
        <div className="mt-4 pt-4 border-t border-border">
          <Button
            onClick={async () => await promptInstall()}
            variant="outline"
            className="w-full h-12 flex items-center justify-center gap-2 border-primary/30 hover:bg-primary/5 text-primary"
          >
            <Download className="w-5 h-5" />
            <span className="font-semibold text-base">Install Web App</span>
          </Button>
        </div>
      )}
    </LoginLayout>
  );
}; 