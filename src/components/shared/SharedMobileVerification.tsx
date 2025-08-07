import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, RefreshCw } from 'lucide-react';
import { ValidationUtils } from '@/utils/validation';

export interface SharedMobileVerificationProps {
  // Core props
  mobile: string;
  otp: string;
  otpSent: boolean;
  resendTimer: number;
  isLoading: boolean;
  
  // Event handlers
  onMobileChange: (mobile: string) => void;
  onOtpChange: (otp: string) => void;
  onSendOTP: () => void;
  onResendOTP: () => void;
  onVerifyOTP: () => void;
  onClearVerificationError?: () => void;
  onBack?: () => void;
  onNext?: () => void;
  
  // Configuration
  mode?: 'registration' | 'login' | 'forgot-password';
  autoVerify?: boolean;
  mobileDisabled?: boolean;
  showProgress?: boolean;
  currentStep?: number;
  totalSteps?: number;
  
  // Error states
  hasVerificationError?: boolean;
  verificationErrorMessage?: string;
  
  // Mobile tracking
  originalMobile?: string;
  allowSendOTP?: boolean;
  
  // UI customization
  title?: string;
  subtitle?: string;
  sendButtonText?: string;
  verifyButtonText?: string;
  resendButtonText?: string;
  className?: string;
}

export const SharedMobileVerification: React.FC<SharedMobileVerificationProps> = ({
  mobile,
  otp,
  otpSent,
  resendTimer,
  isLoading,
  onMobileChange,
  onOtpChange,
  onSendOTP,
  onResendOTP,
  onVerifyOTP,
  onClearVerificationError,
  onBack,
  onNext,
  mode = 'registration',
  autoVerify = true,
  mobileDisabled = false,
  showProgress = false,
  currentStep = 2,
  totalSteps = 3,
  hasVerificationError = false,
  verificationErrorMessage = '',
  originalMobile = '',
  allowSendOTP = true,
  title,
  subtitle,
  sendButtonText = 'Send OTP',
  verifyButtonText = 'Verify OTP',
  resendButtonText = 'Resend OTP',
  className = ''
}) => {
  const [errors, setErrors] = useState<{ mobile?: string; otp?: string }>({});
  const [hasAutoVerified, setHasAutoVerified] = useState(false);

  // Format mobile number as user types
  const formatMobile = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 3) {
      return cleaned;
    } else if (cleaned.length <= 6) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    } else {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
    }
  };

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatMobile(e.target.value);
    onMobileChange(formatted);
    
    // Clear error when user starts typing
    if (errors.mobile) {
      setErrors(prev => ({ ...prev, mobile: undefined }));
    }
    
    // Enable send OTP button if mobile number has changed from original
    if (originalMobile && formatted !== originalMobile) {
      // We need to notify parent component that mobile has changed
      // This will be handled by the parent component
    }
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    onOtpChange(value);
    
    // Clear error when user starts typing
    if (errors.otp) {
      setErrors(prev => ({ ...prev, otp: undefined }));
    }
    
    // Clear verification error when user starts typing new OTP
    if (hasVerificationError && onClearVerificationError) {
      onClearVerificationError();
    }
    
    // Reset auto-verification flag when user manually types
    if (value.length < 6) {
      setHasAutoVerified(false);
    }
  };

  const handleSendOTP = () => {
    const cleanMobile = ValidationUtils.cleanMobileNumber(mobile);
    if (!cleanMobile) {
      setErrors(prev => ({ ...prev, mobile: 'Mobile number is required' }));
      return;
    }
    
    if (!ValidationUtils.isValidMobile(cleanMobile)) {
      setErrors(prev => ({ ...prev, mobile: 'Please enter a valid mobile number' }));
      return;
    }
    
    onSendOTP();
  };

  const handleVerifyOTP = () => {
    if (!otp || otp.length !== 6) {
      setErrors(prev => ({ ...prev, otp: 'Please enter a valid 6-digit OTP' }));
      return;
    }
    
    onVerifyOTP();
  };

  // Auto-submit OTP when 6 digits are entered
  useEffect(() => {
    if (otp.length === 6 && otpSent && !isLoading && !hasAutoVerified) {
      console.log('Auto-verifying OTP...');
      setHasAutoVerified(true);
      handleVerifyOTP();
    }
  }, [otp, otpSent, isLoading, hasAutoVerified]);

  // Reset auto-verification flag when OTP is cleared or changed
  useEffect(() => {
    if (otp.length === 0) {
      setHasAutoVerified(false);
    }
  }, [otp]);

  // Reset auto-verification flag when component mounts (user goes back to this step)
  useEffect(() => {
    setHasAutoVerified(false);
  }, []);

  // Get default title and subtitle based on mode
  const getDefaultTitle = () => {
    switch (mode) {
      case 'login':
        return 'Login with OTP';
      case 'forgot-password':
        return 'Reset Password';
      default:
        return 'Mobile Verification';
    }
  };

  const getDefaultSubtitle = () => {
    switch (mode) {
      case 'login':
        return 'Enter your mobile number to receive a login OTP';
      case 'forgot-password':
        return 'Enter your mobile number to reset your password';
      default:
        return 'Enter your mobile number to verify your account';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Progress indicator */}
      {showProgress && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Step {currentStep} of {totalSteps}</span>
            <span>{Math.round((currentStep / totalSteps) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Title and subtitle */}
      {(title || subtitle) && (
        <div className="text-center mb-4">
          {title && <h2 className="text-lg font-semibold text-gray-900 mb-1">{title}</h2>}
          {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
        </div>
      )}

      {/* Mobile Number Input */}
      <div className="space-y-2">
        <Label htmlFor="mobile" className="text-sm font-medium">
          Mobile Number
        </Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="mobile"
            type="tel"
            value={mobile}
            onChange={handleMobileChange}
            placeholder="+91-XXX-XXX-XXXX"
            className={`h-10 pl-10 text-sm ${errors.mobile ? 'border-red-500' : ''}`}
            disabled={isLoading || mobileDisabled}
          />
        </div>
        {errors.mobile && (
          <div className="text-xs text-red-600 mt-1">
            {errors.mobile}
          </div>
        )}
      </div>

      {/* Send OTP Button */}
      {!otpSent && (
        <Button
          onClick={handleSendOTP}
          disabled={!mobile || isLoading || mobileDisabled || !allowSendOTP}
          className="w-full h-10 bg-primary text-white font-medium text-sm rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Sending OTP...
            </div>
          ) : (
            sendButtonText
          )}
        </Button>
      )}
      
      {/* Show message when mobile hasn't changed */}
      {!otpSent && !allowSendOTP && mobile && (
        <div className="text-center py-2">
          <p className="text-sm text-muted-foreground">
            Change mobile number to send new OTP
          </p>
        </div>
      )}

      {/* OTP Input */}
      {otpSent && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="otp" className="text-sm font-medium">
              Enter OTP
            </Label>
            <Input
              id="otp"
              type="text"
              value={otp}
              onChange={handleOtpChange}
              placeholder="Enter 6-digit OTP"
              className={`h-10 text-center tracking-widest text-sm font-mono ${
                errors.otp || hasVerificationError ? 'border-red-500' : ''
              }`}
              maxLength={6}
              disabled={isLoading}
            />
            {errors.otp && (
              <div className="text-xs text-red-600 mt-1">
                {errors.otp}
              </div>
            )}
            {hasVerificationError && verificationErrorMessage && (
              <div className="text-xs text-red-600 mt-1">
                {verificationErrorMessage}
              </div>
            )}
          </div>

          {/* Resend OTP */}
          <div className="text-center">
            <Button
              type="button"
              variant="link"
              className="p-0 h-auto text-sm"
              onClick={onResendOTP}
              disabled={resendTimer > 0 || isLoading}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : resendButtonText}
            </Button>
          </div>

          {/* Verify OTP Button - Only show when OTP is not 6 digits (for manual verification) */}
          {otp.length !== 6 && otp.length > 0 && (
            <Button
              onClick={handleVerifyOTP}
              disabled={otp.length !== 6 || isLoading}
              className="w-full h-10 bg-primary text-white font-medium text-sm rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Verifying...
                </div>
              ) : (
                verifyButtonText
              )}
            </Button>
          )}

          {/* Auto-verification message */}
          {otp.length === 6 && !isLoading && (
            <div className="text-center py-2">
              <div className="flex items-center justify-center gap-2 text-blue-600">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-medium">Verifying OTP automatically...</span>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          {(onBack || onNext) && (
            <div className="flex gap-3 pt-4">
              {onBack && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onBack}
                  disabled={isLoading}
                  className="flex-1 h-10"
                >
                  Back
                </Button>
              )}
              {onNext && (
                <Button
                  type="button"
                  onClick={onNext}
                  disabled={isLoading || !otpSent}
                  className="flex-1 h-10 bg-primary text-white"
                >
                  Next
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};