import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { 
  User, 
  Phone, 
  Mail, 
  Lock, 
  Shield, 
  Send,
  CheckCircle,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { useAuthApi } from '@/hooks/useApi';
import { useUserManagementApi } from '@/features/user-management/hooks/useUserManagementApi';
import { ValidationUtils } from '@/utils/validation';
import { InvalidTokenPage } from '@/components/shared';
import { useAuthStore } from '@/store/authStore';

interface UserOnboardingData {
  fullName: string;
  userRole: string;
  mobileNumber: string;
  email: string;
  password: string;
  confirmPassword: string;
}

type ApiErrorResponse = {
  message?: string;
  success?: boolean;
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as { message?: string }).message === 'string') {
    return (error as { message?: string }).message as string;
  }

  return 'Something went wrong. Please try again.';
};

const getAxiosErrorDetails = (error: unknown) => {
  if (isAxiosError<ApiErrorResponse>(error) && error.response) {
    return {
      message: error.response.data?.message ?? error.message,
      success: error.response.data?.success,
      status: error.response.status,
    };
  }

  return null;
};



const UserOnboardingRegistration: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [formData, setFormData] = useState<UserOnboardingData>({
    fullName: '',
    userRole: '',
    mobileNumber: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  // Store invitationId from validateToken API response
  const [invitationId, setInvitationId] = useState<string>('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobileVerified, setIsMobileVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  
  // Resend OTP timer states
  const [resendTimer, setResendTimer] = useState(0);
  const [canResendOtp, setCanResendOtp] = useState(false);
  
  // Token validation states
  const [isValidatingToken, setIsValidatingToken] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [tokenValidationMessage, setTokenValidationMessage] = useState('');
  
  // Success popup state
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [userId, setUserId] = useState<string>('');
  
  // User already exists popup state
  const [showUserExistsPopup, setShowUserExistsPopup] = useState(false);

  const ONBOARDING_STEPS = [
    {
      id: 1,
      title: 'Profile info',
      description: 'Confirm invitation details'
    },
    {
      id: 2,
      title: 'Verify & secure',
      description: 'Verify mobile & set password'
    }
  ];

  const [currentStep, setCurrentStep] = useState<number>(1);

  // API hooks
  const sendOTPMutation = useAuthApi.sendOTP();
  const verifyOTPMutation = useAuthApi.verifyOTP();
  const registerMutation = useAuthApi.register(); // Use regular register API first
  const setPasswordMutation = useAuthApi.setPassword(); // Use set-password API
  const { mutateAsync: validateTokenAsync } = useAuthApi.validateToken();
  const updateInvitedUserMutation = useUserManagementApi().updateInvitedUser;
  const setAuthToken = useAuthStore((state) => state.setToken);
  const [lastCheckedToken, setLastCheckedToken] = useState<string | null>(null);

  // Handle resend timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResendOtp(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Validate token on component mount
  useEffect(() => {
    if (!token) {
      setIsValidatingToken(false);
      setIsTokenValid(false);
      setTokenValidationMessage("No invitation token provided.");
      setLastCheckedToken(null);
      return;
    }

    if (lastCheckedToken === token) {
      return;
    }

    let isActive = true;

    const runValidation = async () => {
      try {
        setIsValidatingToken(true);
        const response = await validateTokenAsync({ token });

        if (!isActive) {
          return;
        }

        if (response.success) {
          setIsTokenValid(true);
          setInvitationId(response.invitationId ? response.invitationId : token || '');

          if (response.name) {
            setFormData(prev => ({ ...prev, fullName: response.name || '' }));
          }
          if (response.email) {
            setFormData(prev => ({ ...prev, email: response.email || '' }));
          }
          if (response.mobile) {
            setFormData(prev => ({ ...prev, mobileNumber: response.mobile || '' }));
          }
          if (response.roleName) {
            setFormData(prev => ({ ...prev, userRole: response.roleName || '' }));
          }

          toast({
            title: "Welcome!",
            description: "Your invitation is valid. Please complete your registration.",
          });
        } else {
          setIsTokenValid(false);
          setTokenValidationMessage(response.message || "Invalid invitation token.");
        }
      } catch (error: unknown) {
        console.error('Error validating token:', error);
        setIsTokenValid(false);
        setTokenValidationMessage(getErrorMessage(error) || "Failed to validate invitation token. Please try again.");
      } finally {
        if (isActive) {
          setIsValidatingToken(false);
          setLastCheckedToken(token);
        }
      }
    };

    void runValidation();

    return () => {
      isActive = false;
    };
  }, [token, lastCheckedToken, validateTokenAsync]);

  const handleNextStep = () => {
    if (!formData.fullName.trim()) {
      toast({
        title: 'Full Name Required',
        description: 'Please enter your full name before continuing.',
        variant: 'destructive'
      });
      return;
    }

    if (!formData.userRole) {
      toast({
        title: 'User Role Required',
        description: 'Your invitation must include a role. Please contact your administrator if this looks wrong.',
        variant: 'destructive'
      });
      return;
    }

    setCurrentStep(2);
  };

  const handlePrevStep = () => {
    setCurrentStep(1);
  };

  const handleSendOTP = async () => {
    // Validation
    if (!formData.fullName.trim()) {
      toast({
        title: "Full Name Required",
        description: "Please enter your full name before sending OTP.",
        variant: "destructive"
      });
      return;
    }

    if (!formData.mobileNumber) {
      toast({
        title: "Mobile Number Required",
        description: "Mobile number is required.",
        variant: "destructive"
      });
      return;
    }

    if (!formData.userRole) {
      toast({
        title: "User Role Required",
        description: "User role is required.",
        variant: "destructive"
      });
      return;
    }

    try {
      setOtpLoading(true);
      const cleanMobile = ValidationUtils.cleanMobileNumber(formData.mobileNumber);
      
      // First call register API with fullName and role for onboarding scenario
      const registerResponse = await registerMutation.mutateAsync({
        mobileNumber: cleanMobile,
        roles: formData.userRole // Pass the role from invitation
      });

      if (registerResponse.success) {
        // Then send OTP
        const otpResponse = await sendOTPMutation.mutateAsync({
          mobileNumber: cleanMobile
        });

        if (otpResponse.success) {
          setOtpSent(true);
          // Start 30-second timer for resend
          setResendTimer(30);
          setCanResendOtp(false);
          toast({
            title: "Registration Initiated",
            description: "User registered successfully. Please check your mobile for the verification code."
          });
        } else {
          throw new Error(otpResponse.message || 'Failed to send OTP');
        }
      } else {
        throw new Error(registerResponse.message || 'Failed to register user');
      }
    } catch (error: unknown) {
      const axiosDetails = getAxiosErrorDetails(error);
      const apiMessage = axiosDetails?.message ?? getErrorMessage(error);
      const apiSuccess = axiosDetails?.success;
      const httpStatus = axiosDetails?.status;

      const normalizedMessage = apiMessage?.toLowerCase() ?? '';
      const isMobileExistsError = normalizedMessage.includes('mobile number already exists') ||
        normalizedMessage.includes('mobile already exists') ||
        normalizedMessage.includes('user already exists') ||
        normalizedMessage.includes('already registered');

      const isConflictStatus = httpStatus === 409 || httpStatus === 400;
      const isApiError = apiSuccess === false && isMobileExistsError;

      if (isMobileExistsError || isConflictStatus || isApiError) {
        setShowUserExistsPopup(true);
      } else {
        toast({
          title: "Error",
          description: apiMessage,
          variant: "destructive"
        });
      }
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      setOtpLoading(true);
      const cleanMobile = ValidationUtils.cleanMobileNumber(formData.mobileNumber);
      
      const otpResponse = await sendOTPMutation.mutateAsync({
        mobileNumber: cleanMobile
      });

      if (otpResponse.success) {
        // Reset timer for another 30 seconds
        setResendTimer(30);
        setCanResendOtp(false);
        setOtp(''); // Clear current OTP input
        toast({
          title: "OTP Resent",
          description: "A new verification code has been sent to your mobile number."
        });
      } else {
        throw new Error(otpResponse.message || 'Failed to resend OTP');
      }
    } catch (error: unknown) {
      toast({
        title: "Resend Failed",
        description: getErrorMessage(error) || "Failed to resend OTP. Please try again.",
        variant: "destructive"
      });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter a valid 6-digit OTP",
        variant: "destructive"
      });
      return;
    }

    try {
      setOtpLoading(true);
      const cleanMobile = ValidationUtils.cleanMobileNumber(formData.mobileNumber);

      const response = await verifyOTPMutation.mutateAsync({
        mobileNumber: cleanMobile,
        otp: otp
      });

      if (response.success) {
        // Store userId from OTP verification response
        const verifiedUserId = response.userId;
        setUserId(verifiedUserId);

        // Persist access token so subsequent API calls include authorization header
        if (response.accessToken) {
          setAuthToken(response.accessToken);
        }

        // Call the update invited user API after successful OTP verification
        if (invitationId && invitationId !== '' && verifiedUserId) {
          try {
            await updateInvitedUserMutation.mutateAsync({
              invitationId: invitationId,
              userId: verifiedUserId
            });
          } catch (updateError: unknown) {
            console.warn('Failed to update invited user after OTP verification', updateError);
          }
        }

        setIsMobileVerified(true);
        console.log('OTP verified, userId:', verifiedUserId);
        toast({
          title: "Mobile Verified",
          description: "Your mobile number has been successfully verified!",
        });
      } else {
        throw new Error(response.message || 'Invalid OTP');
      }
    } catch (error: unknown) {
      toast({
        title: "Verification Failed",
        description: getErrorMessage(error) || "Invalid OTP. Please try again.",
        variant: "destructive"
      });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (currentStep !== 2) {
      handleNextStep();
      return;
    }
    
    // Validation
    if (!formData.fullName.trim()) {
      toast({
        title: "Full Name Required",
        description: "Please enter your full name.",
        variant: "destructive"
      });
      return;
    }

    if (!formData.userRole) {
      toast({
        title: "User Role Required",
        description: "Please select your user role.",
        variant: "destructive"
      });
      return;
    }

    if (!isMobileVerified) {
      toast({
        title: "Mobile Verification Required",
        description: "Please verify your mobile number first.",
        variant: "destructive"
      });
      return;
    }

    if (!userId) {
      toast({
        title: "User ID Required",
        description: "Please complete mobile verification first.",
        variant: "destructive"
      });
      return;
    }

    if (!formData.password) {
      toast({
        title: "Password Required",
        description: "Please set a password for your account.",
        variant: "destructive"
      });
      return;
    }

    if (formData.password.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters long.",
        variant: "destructive"
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure your passwords match.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      // Call set-password API with the user data
      const response = await setPasswordMutation.mutateAsync({
        userId: userId, // Use userId from OTP verification
        email: formData.email || formData.mobileNumber, // Use email or mobile as fallback
        password: formData.password
      });

      if (response.success) {
        // Show success popup only after password setup
        setShowSuccessPopup(true);
        console.log('Password setup successful, show success popup');
      } else {
        throw new Error(response.message || 'Password setup failed');
      }
    } catch (error: unknown) {
      toast({
        title: "Registration Failed",
        description: getErrorMessage(error) || "Failed to set password. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: keyof UserOnboardingData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isStepOneComplete = Boolean(formData.fullName.trim() && formData.userRole);
  const stepTitle = currentStep === 1 ? 'Confirm your details' : 'Verify & secure your account';
  const stepDescription = currentStep === 1
    ? 'Make sure we have the right name and contact information from your invitation.'
    : 'Verify your mobile number and create a password to activate your account.';

  // Show loading while validating token
  if (isValidatingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
        <div className="text-center space-y-3 sm:space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-base sm:text-lg font-medium text-gray-700">Validating your invitation...</p>
          <p className="text-xs sm:text-sm text-gray-500">Please wait while we verify your invitation link</p>
        </div>
      </div>
    );
  }

  // Show invalid token page if token is not valid
  if (!isTokenValid) {
    return <InvalidTokenPage message={tokenValidationMessage} />;
  }

  // Show loading while submitting form
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
        <div className="text-center space-y-3 sm:space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-base sm:text-lg font-medium text-gray-700">Creating your account...</p>
          <p className="text-xs sm:text-sm text-gray-500">Please wait while we set up your profile</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-100 px-4 py-6 flex items-center justify-center">
        <div className="w-full max-w-5xl">
          <div className="grid gap-5 lg:grid-cols-[260px,1fr]">
            <div className="bg-white/80 backdrop-blur rounded-3xl p-6 shadow-sm border border-white space-y-6">
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <img src="/Logo.png" alt="NexEagle Logo" className="h-10 w-auto" />
                  <h1 className="text-xl font-bold text-slate-900">NexEagle</h1>
                </div>
                <p className="text-sm text-slate-500">Invitation-based onboarding</p>
              </div>

              <div className="space-y-4">
                {ONBOARDING_STEPS.map((step) => {
                  const isActive = currentStep === step.id;
                  const isComplete = currentStep > step.id || (step.id === 1 && isStepOneComplete && currentStep >= step.id);
                  return (
                    <div key={step.id} className="flex items-start gap-3">
                      <div
                        className={`h-10 w-10 rounded-full border-2 flex items-center justify-center text-sm font-semibold transition-colors ${
                          isComplete
                            ? 'border-green-500 bg-green-500 text-white shadow-sm'
                            : isActive
                              ? 'border-blue-600 bg-blue-50 text-blue-600'
                              : 'border-slate-200 text-slate-400'
                        }`}
                      >
                        {isComplete ? <CheckCircle className="h-5 w-5" /> : step.id}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{step.title}</p>
                        <p className="text-sm text-slate-500 leading-snug">{step.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 space-y-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">User role</p>
                  <p className="font-semibold text-slate-900">{formData.userRole || '—'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Mobile number</p>
                  <p className="font-semibold text-slate-900">{formData.mobileNumber || '—'}</p>
                  <p className="text-xs text-slate-500">Provided by your administrator</p>
                </div>
                <div className="text-xs text-slate-500">
                  Questions? <span className="text-blue-600 font-semibold">support@nexeagle.com</span>
                </div>
              </div>
            </div>

            <Card className="shadow-xl border-0 rounded-3xl">
              <CardHeader className="pb-4">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Step {currentStep} of {ONBOARDING_STEPS.length}</p>
                  <CardTitle className="text-2xl font-semibold text-slate-900">{stepTitle}</CardTitle>
                  <p className="text-sm text-muted-foreground">{stepDescription}</p>
                </div>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {currentStep === 1 ? (
                    <div className="space-y-5">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="fullName" className="flex items-center gap-2 text-sm font-medium text-slate-700">
                            <User className="h-4 w-4" />
                            Full Name *
                          </Label>
                          <Input
                            id="fullName"
                            value={formData.fullName}
                            onChange={(e) => updateFormData('fullName', e.target.value)}
                            placeholder="Enter your full name"
                            className="h-11"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email" className="flex items-center gap-2 text-sm font-medium text-slate-700">
                            <Mail className="h-4 w-4" />
                            Email Address <span className="text-xs text-muted-foreground">(optional)</span>
                          </Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => updateFormData('email', e.target.value)}
                            placeholder="Enter email address"
                            className="h-11"
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="userRole" className="flex items-center gap-2 text-sm font-medium text-slate-700">
                            <Shield className="h-4 w-4" />
                            Invitation Role
                          </Label>
                          <Input
                            id="userRole"
                            value={formData.userRole}
                            disabled
                            readOnly
                            className="h-11 bg-slate-50"
                          />
                          <p className="text-xs text-muted-foreground">Roles are pre-assigned by your administrator.</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full sm:w-auto"
                          onClick={() => navigate('/')}
                        >
                          Back to login
                        </Button>
                        <Button
                          type="button"
                          className="w-full sm:w-auto"
                          onClick={handleNextStep}
                        >
                          Continue to verification
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="mobileNumber" className="flex items-center gap-2 text-sm font-medium text-slate-700">
                              <Phone className="h-4 w-4" />
                              Mobile Number *
                            </Label>
                            <div className="flex gap-2">
                              <Input
                                id="mobileNumber"
                                value={formData.mobileNumber}
                                disabled
                                readOnly
                                className="h-11 bg-white"
                              />
                              <Button
                                type="button"
                                onClick={handleSendOTP}
                                disabled={otpLoading || !formData.mobileNumber || isMobileVerified}
                                variant={isMobileVerified ? 'secondary' : 'default'}
                                className="h-11 whitespace-nowrap"
                              >
                                {isMobileVerified ? (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Verified
                                  </>
                                ) : (
                                  <>
                                    <Send className="h-4 w-4 mr-1" />
                                    Send OTP
                                  </>
                                )}
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">We’ll send a verification code to this number.</p>
                          </div>

                          {otpSent && !isMobileVerified && (
                            <div className="space-y-3 rounded-2xl bg-white border border-blue-100 p-3">
                              <Label htmlFor="otp" className="text-sm font-medium text-blue-900">
                                Enter the 6-digit OTP
                              </Label>
                              <div className="flex gap-2">
                                <Input
                                  id="otp"
                                  value={otp}
                                  onChange={(e) => setOtp(e.target.value)}
                                  placeholder="000000"
                                  className="h-11 text-center tracking-[0.3em]"
                                  maxLength={6}
                                />
                                <Button
                                  type="button"
                                  onClick={handleVerifyOTP}
                                  disabled={otpLoading || otp.length !== 6}
                                  className="h-11"
                                >
                                  {otpLoading ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                  ) : (
                                    'Verify'
                                  )}
                                </Button>
                              </div>
                              <div className="flex items-center justify-between text-xs text-blue-700">
                                <span>
                                  {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Didn't receive the code?"}
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleResendOTP}
                                  disabled={!canResendOtp || otpLoading}
                                  className="h-auto px-2 text-blue-700"
                                >
                                  Resend
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="password" className="flex items-center gap-2 text-sm font-medium text-slate-700">
                              <Lock className="h-4 w-4" />
                              Password *
                            </Label>
                            <div className="relative">
                              <Input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                value={formData.password}
                                onChange={(e) => updateFormData('password', e.target.value)}
                                placeholder="Minimum 8 characters"
                                className="h-11 pr-12"
                                disabled={!isMobileVerified}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-1 top-1 h-9 w-9"
                                onClick={() => setShowPassword(!showPassword)}
                                disabled={!isMobileVerified}
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="confirmPassword" className="flex items-center gap-2 text-sm font-medium text-slate-700">
                              <Lock className="h-4 w-4" />
                              Confirm Password *
                            </Label>
                            <div className="relative">
                              <Input
                                id="confirmPassword"
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={formData.confirmPassword}
                                onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                                placeholder="Re-enter password"
                                className="h-11 pr-12"
                                disabled={!isMobileVerified}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-1 top-1 h-9 w-9"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                disabled={!isMobileVerified}
                              >
                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                            {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                              <p className="text-xs text-red-500">Passwords don't match</p>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">Use at least 8 characters with a mix of letters and numbers.</p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <Button type="button" variant="ghost" onClick={handlePrevStep} className="w-full sm:w-auto">
                          ← Back
                        </Button>
                        <div className="flex-1 text-xs text-muted-foreground sm:text-right sm:pr-4">
                          By completing this step you agree to our{' '}
                          <span className="text-blue-600">Terms</span> &{' '}
                          <span className="text-blue-600">Privacy Policy</span>.
                        </div>
                        <Button
                          type="submit"
                          className="w-full sm:w-auto"
                          disabled={isLoading || !isMobileVerified}
                        >
                          {isLoading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Creating Account...
                            </>
                          ) : (
                            'Complete Registration'
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Success Popup Dialog */}
      <Dialog open={showSuccessPopup} onOpenChange={setShowSuccessPopup}>
         <DialogContent className="sm:max-w-md">
           <DialogHeader>
             <DialogTitle className="flex items-center gap-2">
               <div className="p-2 bg-green-100 rounded-full">
                 <CheckCircle2 className="h-6 w-6 text-green-600" />
               </div>
               Registration Successful!
             </DialogTitle>
             <DialogDescription className="text-left space-y-4">
               <p className="text-base">
                 Congratulations! Your account has been created successfully.
               </p>
               <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                 <h4 className="font-medium text-green-800 mb-2">What's Next?</h4>
                 <ul className="text-sm text-green-700 space-y-1">
                   <li>• Your account is now active in the system</li>
                   <li>• You can log in using your mobile number and password</li>
                   <li>• Contact your administrator if you need any assistance</li>
                 </ul>
               </div>
             </DialogDescription>
           </DialogHeader>
           <DialogFooter className="flex flex-col sm:flex-row gap-2">
             <Button
               onClick={() => navigate('/')}
               className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
             >
               <ArrowLeft className="h-4 w-4 mr-2" />
               Go to Login Page
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>

      {/* User Already Exists Popup Dialog */}
      <Dialog open={showUserExistsPopup} onOpenChange={setShowUserExistsPopup}>
         <DialogContent className="sm:max-w-md">
           <DialogHeader>
             <DialogTitle className="flex items-center gap-2">
               <div className="p-2 bg-orange-100 rounded-full">
                 <AlertCircle className="h-6 w-6 text-orange-600" />
               </div>
               User Already Registered
             </DialogTitle>
             <DialogDescription className="text-left space-y-4">
               <p className="text-base">
                 An account with this mobile number is already registered in our system. You cannot register again with the same mobile number.
               </p>
               <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                 <h4 className="font-medium text-orange-800 mb-2">What should you do?</h4>
                 <ul className="text-sm text-orange-700 space-y-1">
                   <li>• Try logging in with your existing mobile number and password</li>
                   <li>• If you forgot your password, use the "Forgot Password" option on the login page</li>
                   <li>• Contact your administrator if you need help accessing your account</li>
                 </ul>
               </div>
               <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                 <h4 className="font-medium text-blue-800 mb-2">Need Help?</h4>
                 <p className="text-sm text-blue-700">
                   If you believe this is an error or need assistance, please contact your system administrator.
                 </p>
               </div>
             </DialogDescription>
           </DialogHeader>
           <DialogFooter className="flex flex-col sm:flex-row gap-2">
             <Button
               onClick={() => navigate('/')}
               className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
             >
               <ArrowLeft className="h-4 w-4 mr-2" />
               Go to Login Page
             </Button>
             <Button
               variant="outline"
               onClick={() => setShowUserExistsPopup(false)}
               className="w-full sm:w-auto"
             >
               Stay on This Page
             </Button>
           </DialogFooter>
         </DialogContent>
      </Dialog>
    </>
  );
};

export default UserOnboardingRegistration;
