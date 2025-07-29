import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ValidationUtils } from '@/utils/validation';
import { SharedMobileVerification } from '@/components/shared';

interface ForgotPasswordFormProps {
  onSendOTP: (mobile: string) => Promise<void>;
  onVerifyOTP: (mobile: string, otp: string) => Promise<void>;
  onResetPassword: (mobile: string, otp: string, newPassword: string) => Promise<void>;
  onBackToLogin: () => void;
  isLoading: boolean;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  onSendOTP,
  onVerifyOTP,
  onResetPassword,
  onBackToLogin,
  isLoading
}) => {
  const [forgotMobile, setForgotMobile] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotOtpTimer, setForgotOtpTimer] = useState(0);
  const [passwordStrength, setPasswordStrength] = useState<{ isValid: boolean; strength: 'weak' | 'medium' | 'strong'; errors: string[] }>({ isValid: false, strength: 'weak', errors: [] });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);

  // Password strength validation
  useEffect(() => {
    if (newPassword) {
      setPasswordStrength(ValidationUtils.validatePassword(newPassword));
    }
  }, [newPassword]);

  // OTP timer countdown
  useEffect(() => {
    if (forgotOtpTimer > 0) {
      const timer = setInterval(() => {
        setForgotOtpTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [forgotOtpTimer]);

  const handleSendOTP = async () => {
    const sanitizedMobile = ValidationUtils.sanitizeInput(forgotMobile);
    if (!sanitizedMobile || !ValidationUtils.isValidMobile(sanitizedMobile)) {
      setErrors({ mobile: 'Please enter a valid mobile number' });
      return;
    }

    try {
      await onSendOTP(sanitizedMobile);
      setIsOtpSent(true);
      setForgotOtpTimer(30);
      setForgotStep(2);
      setErrors({});
    } catch (error) {
      // Error handling is done in parent component
    }
  };

  const handleResendOTP = async () => {
    if (forgotOtpTimer > 0) return;
    
    const sanitizedMobile = ValidationUtils.sanitizeInput(forgotMobile);
    if (!ValidationUtils.checkRateLimit(`resend_forgot_otp_${sanitizedMobile}`, 3, 5 * 60 * 1000)) {
      return;
    }
    
    try {
      await onSendOTP(sanitizedMobile);
      setForgotOtpTimer(30);
    } catch (error) {
      // Error handling is done in parent component
    }
  };

  const handleVerifyOTP = async () => {
    const sanitizedOtp = ValidationUtils.sanitizeInput(forgotOtp);
    if (!sanitizedOtp || !ValidationUtils.isValidOTP(sanitizedOtp)) {
      setErrors({ otp: 'Please enter a valid 6-digit OTP' });
      return;
    }

    try {
      await onVerifyOTP(forgotMobile, sanitizedOtp);
      setForgotStep(3);
      setErrors({});
    } catch (error) {
      // Error handling is done in parent component
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const sanitizedNewPassword = ValidationUtils.sanitizeInput(newPassword);
    const sanitizedConfirmPassword = ValidationUtils.sanitizeInput(confirmPassword);

    // Validate password fields
    if (!sanitizedNewPassword || !sanitizedConfirmPassword) {
      setErrors({ password: 'Please fill in both password fields' });
      return;
    }

    // Validate password match
    if (sanitizedNewPassword !== sanitizedConfirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }

    // Validate password strength
    if (!passwordStrength.isValid) {
      setErrors({ password: 'Password does not meet security requirements' });
      return;
    }

    try {
      await onResetPassword(forgotMobile, forgotOtp, sanitizedNewPassword);
      setErrors({});
    } catch (error) {
      // Error handling is done in parent component
    }
  };

  const getPasswordStrengthColor = (strength: string) => {
    switch (strength) {
      case 'weak': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'strong': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  const getPasswordStrengthText = (strength: string) => {
    switch (strength) {
      case 'weak': return 'Weak';
      case 'medium': return 'Medium';
      case 'strong': return 'Strong';
      default: return '';
    }
  };

  // Step 1: Mobile Number Input
  if (forgotStep === 1) {
    return (
      <div className="space-y-4">
        <SharedMobileVerification
          mobile={forgotMobile}
          otp=""
          otpSent={false}
          resendTimer={0}
          isLoading={isLoading}
          onMobileChange={setForgotMobile}
          onOtpChange={() => {}}
          onSendOTP={handleSendOTP}
          onResendOTP={() => {}}
          onVerifyOTP={() => {}}
          mode="forgot-password"
          autoVerify={true}
        />
        
        {/* Back to Login */}
        <div className="flex justify-start">
          <Button
            type="button"
            variant="link"
            className="p-0 h-auto text-sm text-primary"
            onClick={onBackToLogin}
            disabled={isLoading}
          >
            ← Back to Login
          </Button>
        </div>
      </div>
    );
  }

  // Step 2: OTP Verification
  if (forgotStep === 2) {
    return (
      <div className="space-y-4">
        <SharedMobileVerification
          mobile={forgotMobile}
          otp={forgotOtp}
          otpSent={isOtpSent}
          resendTimer={forgotOtpTimer}
          isLoading={isLoading}
          onMobileChange={setForgotMobile}
          onOtpChange={setForgotOtp}
          onSendOTP={handleSendOTP}
          onResendOTP={handleResendOTP}
          onVerifyOTP={handleVerifyOTP}
          mode="forgot-password"
          mobileDisabled={true}
          autoVerify={true}
        />
        
        {/* Back to Step 1 */}
        <div className="flex justify-start">
          <Button
            type="button"
            variant="link"
            className="p-0 h-auto text-sm text-primary"
            onClick={() => {
              setForgotStep(1);
              setIsOtpSent(false);
              setForgotOtp('');
            }}
            disabled={isLoading}
          >
            ← Back to Mobile Input
          </Button>
        </div>
      </div>
    );
  }

  // Step 3: Password Reset
  return (
    <form onSubmit={handleResetPassword} className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          Set New Password
        </h2>
        <p className="text-sm text-gray-600">
          Create a strong password for your account
        </p>
      </div>

      {/* New Password */}
      <div className="space-y-2">
        <Label htmlFor="newPassword" className="text-sm font-medium">
          New Password
        </Label>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            id="newPassword"
            type={showPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => {
              setNewPassword(ValidationUtils.sanitizeInput(e.target.value));
              if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
            }}
            placeholder="Enter new password"
            className={`h-12 pl-12 pr-12 text-base ${errors.password ? 'border-red-500' : ''}`}
            disabled={isLoading}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
            onClick={() => setShowPassword(!showPassword)}
            disabled={isLoading}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
        {newPassword && (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium ${getPasswordStrengthColor(passwordStrength.strength)}`}>
                {getPasswordStrengthText(passwordStrength.strength)}
              </span>
            </div>
            {passwordStrength.errors.length > 0 && (
              <div className="text-xs text-red-600">
                {passwordStrength.errors.map((error, index) => (
                  <div key={index}>• {error}</div>
                ))}
              </div>
            )}
          </div>
        )}
        {errors.password && (
          <div className="text-xs text-red-600 mt-1">
            {errors.password}
          </div>
        )}
      </div>

      {/* Confirm Password */}
      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-sm font-medium">
          Confirm New Password
        </Label>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(ValidationUtils.sanitizeInput(e.target.value));
              if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: undefined }));
            }}
            placeholder="Confirm new password"
            className={`h-12 pl-12 pr-12 text-base ${errors.confirmPassword ? 'border-red-500' : ''}`}
            disabled={isLoading}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            disabled={isLoading}
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
        {errors.confirmPassword && (
          <div className="text-xs text-red-600 mt-1">
            {errors.confirmPassword}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => setForgotStep(2)}
          disabled={isLoading}
          className="flex-1 h-10"
        >
          Back
        </Button>
        
        <Button
          type="submit"
          disabled={isLoading || !passwordStrength.isValid || newPassword !== confirmPassword}
          className="flex-1 h-10 bg-primary text-white"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Resetting...
            </div>
          ) : (
            'Reset Password'
          )}
        </Button>
      </div>
    </form>
  );
}; 