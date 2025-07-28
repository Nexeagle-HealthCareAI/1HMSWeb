import React, { useState, useEffect } from 'react';
import { Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ValidationUtils } from '@/utils/validation';

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

  // Password strength validation
  useEffect(() => {
    if (newPassword) {
      setPasswordStrength(ValidationUtils.validatePassword(newPassword));
    }
  }, [newPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (forgotStep === 1) {
      setErrors({});
      const sanitizedMobile = ValidationUtils.sanitizeInput(forgotMobile);
      
      if (!sanitizedMobile) {
        setErrors({ mobile: 'Mobile number is required' });
        return;
      }
      
      if (!ValidationUtils.isValidMobile(sanitizedMobile)) {
        setErrors({ mobile: 'Please enter a valid mobile number' });
        return;
      }

      // Rate limiting is handled in the parent component (SecureLogin.tsx)
      // No need to check here to avoid duplicate rate limiting

      try {
        // Clean mobile number for API
        const cleanMobile = ValidationUtils.cleanMobileNumber(sanitizedMobile);
        await onSendOTP(cleanMobile);
        setForgotStep(2);
        setForgotOtpTimer(30);
      } catch (error) {
        // Error handling is done in parent component
        console.error('Error in ForgotPasswordForm:', error);
      }
      return;
    }

    if (forgotStep === 2) {
      const sanitizedOtp = ValidationUtils.sanitizeInput(forgotOtp);
      if (!sanitizedOtp || !ValidationUtils.isValidOTP(sanitizedOtp)) {
        return;
      }
      
      // Call OTP verification API
      const cleanMobile = ValidationUtils.cleanMobileNumber(forgotMobile);
      console.log('ForgotPasswordForm: Calling onVerifyOTP with:', { cleanMobile, sanitizedOtp });
      try {
        await onVerifyOTP(cleanMobile, sanitizedOtp);
        console.log('ForgotPasswordForm: OTP verification successful, moving to step 3');
        setForgotStep(3);
      } catch (error) {
        console.error('ForgotPasswordForm: OTP verification failed:', error);
        // Don't proceed to next step if verification fails
        return;
      }
      return;
    }

    if (forgotStep === 3) {
      console.log('ForgotPasswordForm: Step 3 - Password reset submission');
      console.log('Password strength:', passwordStrength);
      
      const sanitizedNewPassword = ValidationUtils.sanitizeInput(newPassword);
      const sanitizedConfirmPassword = ValidationUtils.sanitizeInput(confirmPassword);

      // Validate password fields
      if (!sanitizedNewPassword || !sanitizedConfirmPassword) {
        console.log('ForgotPasswordForm: Password fields are empty');
        setErrors({ password: 'Please fill in both password fields' });
        return;
      }

      // Validate password match
      if (sanitizedNewPassword !== sanitizedConfirmPassword) {
        console.log('ForgotPasswordForm: Passwords do not match');
        setErrors({ password: 'Passwords do not match' });
        return;
      }

      // Validate password strength
      if (!passwordStrength.isValid) {
        console.log('ForgotPasswordForm: Password strength validation failed');
        setErrors({ password: 'Please ensure your password meets all requirements' });
        return;
      }
      
      console.log('ForgotPasswordForm: All validations passed, calling onResetPassword');
      setErrors({}); // Clear any previous errors
      
      try {
        const cleanMobile = ValidationUtils.cleanMobileNumber(forgotMobile);
        await onResetPassword(cleanMobile, forgotOtp, sanitizedNewPassword);
        console.log('ForgotPasswordForm: Password reset successful');
        // Reset form after successful password reset
        setForgotStep(1);
        setForgotMobile('');
        setForgotOtp('');
        setNewPassword('');
        setConfirmPassword('');
      } catch (error) {
        console.error('ForgotPasswordForm: Password reset failed:', error);
        // Error handling is done in parent component
      }
    }
  };

  const resendForgotOtp = async () => {
    if (forgotOtpTimer > 0) return;
    
    const sanitizedMobile = ValidationUtils.sanitizeInput(forgotMobile);
    if (!ValidationUtils.checkRateLimit(`resend_forgot_otp_${sanitizedMobile}`, 2, 1 * 60 * 1000)) {
      return;
    }
    
    try {
      // Clean mobile number for API
      const cleanMobile = ValidationUtils.cleanMobileNumber(sanitizedMobile);
      await onSendOTP(cleanMobile);
      setForgotOtpTimer(30);
    } catch (error) {
      // Error handling is done in parent component
    }
  };

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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {forgotStep === 1 && (
        <div className="space-y-2">
          <Label htmlFor="forgotMobile" className="text-sm font-medium">
            Mobile Number
          </Label>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              id="forgotMobile"
              type="tel"
              value={forgotMobile}
              onChange={(e) => setForgotMobile(ValidationUtils.sanitizeInput(e.target.value))}
              placeholder="+91-XXXXXXXXXX"
              className={`h-12 pl-12 text-base ${errors.mobile ? 'border-red-500' : ''}`}
              disabled={isLoading}
            />
          </div>
          {errors.mobile && (
            <div className="text-xs text-red-600 mt-1">
              {errors.mobile}
            </div>
          )}
        </div>
      )}

      {forgotStep === 2 && (
        <div className="space-y-2">
          <Label htmlFor="forgotOtp" className="text-sm font-medium">
            Enter OTP
          </Label>
          <Input
            id="forgotOtp"
            type="text"
            value={forgotOtp}
            onChange={(e) => setForgotOtp(ValidationUtils.sanitizeInput(e.target.value))}
            placeholder="Enter 6-digit OTP"
            className="h-12 text-center tracking-widest text-base font-mono"
            maxLength={6}
            disabled={isLoading}
          />
          <Button
            type="button"
            variant="link"
            className="p-0 h-auto text-sm"
            onClick={resendForgotOtp}
            disabled={forgotOtpTimer > 0 || isLoading}
          >
            {forgotOtpTimer > 0 ? `Resend OTP in ${forgotOtpTimer}s` : 'Resend OTP'}
          </Button>
        </div>
      )}

      {forgotStep === 3 && (
        <>
          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-sm font-medium">
              New Password
            </Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(ValidationUtils.sanitizeInput(e.target.value))}
              placeholder="Enter new password"
              className="h-12 text-base"
              disabled={isLoading}
            />
            {/* Password strength indicator */}
            {newPassword && (
              <div className="text-xs">
                <div className="flex items-center gap-2 mb-1">
                  <span>Strength:</span>
                  <div className="flex gap-1">
                    <div className={`h-1 w-8 rounded ${passwordStrength.strength === 'weak' ? 'bg-red-500' : passwordStrength.strength === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                    <div className={`h-1 w-8 rounded ${passwordStrength.strength === 'medium' ? 'bg-yellow-500' : passwordStrength.strength === 'strong' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <div className={`h-1 w-8 rounded ${passwordStrength.strength === 'strong' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  </div>
                  <span className={`text-xs ${passwordStrength.strength === 'weak' ? 'text-red-600' : passwordStrength.strength === 'medium' ? 'text-yellow-600' : 'text-green-600'}`}>
                    {passwordStrength.strength}
                  </span>
                </div>
                {passwordStrength.errors.length > 0 && (
                  <div className="text-red-600">
                    {passwordStrength.errors.map((error, index) => (
                      <div key={index}>• {error}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm Password
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(ValidationUtils.sanitizeInput(e.target.value))}
              placeholder="Confirm new password"
              className="h-12 text-base"
              disabled={isLoading}
            />
                         {confirmPassword && newPassword !== confirmPassword && (
               <div className="text-xs text-red-600">Passwords don't match</div>
             )}
             {errors.password && (
               <div className="text-xs text-red-600 mt-1">
                 {errors.password}
               </div>
             )}
          </div>
        </>
      )}

      <Button 
        type="submit" 
        className="w-full h-12 bg-gradient-primary text-white font-semibold text-base rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Processing...
          </div>
        ) : (
          forgotStep === 1 ? "Send OTP" :
          forgotStep === 2 ? "Verify OTP" :
          "Reset Password"
        )}
      </Button>

      <div className="mt-4 text-center">
        <Button
          type="button"
          variant="link"
          className="p-0 h-auto text-sm text-muted-foreground"
          onClick={onBackToLogin}
          disabled={isLoading}
        >
          ← Back to Login
        </Button>
      </div>
    </form>
  );
}; 