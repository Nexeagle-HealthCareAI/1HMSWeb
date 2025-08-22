import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Mail, Lock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ValidationUtils } from '@/utils/validation';

interface EmailPasswordSetupProps {
  email: string;
  password: string;
  isLoading: boolean;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onComplete: () => void;
  onSkip: () => void;
  onBack: () => void;
}

export const EmailPasswordSetup: React.FC<EmailPasswordSetupProps> = ({
  email,
  password,
  isLoading,
  onEmailChange,
  onPasswordChange,
  onComplete,
  onSkip,
  onBack
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStrength, setPasswordStrength] = useState<{ isValid: boolean; strength: 'weak' | 'medium' | 'strong'; errors: string[] }>({ isValid: false, strength: 'weak', errors: [] });
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});
  const [passwordMatchStatus, setPasswordMatchStatus] = useState<'idle' | 'matching' | 'not-matching'>('idle');

  // Password strength validation
  useEffect(() => {
    if (password) {
      setPasswordStrength(ValidationUtils.validatePassword(password));
    }
  }, [password]);

  // Password matching validation
  useEffect(() => {
    if (confirmPassword && password) {
      if (password === confirmPassword) {
        setPasswordMatchStatus('matching');
      } else {
        setPasswordMatchStatus('not-matching');
      }
    } else if (confirmPassword && !password) {
      setPasswordMatchStatus('not-matching');
    } else {
      setPasswordMatchStatus('idle');
    }
  }, [password, confirmPassword]);

  const handleEmailChange = (value: string) => {
    const sanitizedEmail = ValidationUtils.sanitizeInput(value);
    onEmailChange(sanitizedEmail);
    
    // Real-time email validation
    if (sanitizedEmail.trim()) {
      const emailError = ValidationUtils.validateEmail(sanitizedEmail);
      if (emailError) {
        setErrors(prev => ({ ...prev, email: emailError }));
      } else {
        setErrors(prev => ({ ...prev, email: undefined }));
      }
    } else {
      // Clear error when field is empty (email is optional)
      setErrors(prev => ({ ...prev, email: undefined }));
    }
  };

  const handlePasswordChange = (value: string) => {
    const sanitizedPassword = ValidationUtils.sanitizeInput(value);
    onPasswordChange(sanitizedPassword);
    
    // Clear password error when user starts typing
    if (errors.password) {
      setErrors(prev => ({ ...prev, password: undefined }));
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    const sanitizedConfirmPassword = ValidationUtils.sanitizeInput(value);
    setConfirmPassword(sanitizedConfirmPassword);
    
    // Clear confirm password error when user starts typing
    if (errors.confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: undefined }));
    }
  };

  const validateForm = () => {
    const newErrors: { email?: string; password?: string; confirmPassword?: string } = {};

    // Validate email (email is optional but if provided, it must be valid)
    const emailError = ValidationUtils.validateEmail(email);
    if (emailError) {
      newErrors.email = emailError;
    }

    // Validate password
    if (!password.trim()) {
      newErrors.password = 'Password is required';
    } else if (!passwordStrength.isValid) {
      newErrors.password = 'Password does not meet security requirements';
    }

    // Validate confirm password
    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleComplete = () => {
    if (validateForm()) {
      onComplete();
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

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          Set Up Your Account
        </h2>
        <p className="text-xs text-gray-600">
          Add your email and create a password to complete your registration
        </p>
      </div>

      {/* Email Input */}
      <div className="space-y-1">
        <Label htmlFor="email" className="text-xs font-medium">
          Email Address
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => handleEmailChange(e.target.value)}
            placeholder="Enter your email address"
            className={`h-10 pl-10 pr-10 text-sm ${
              errors.email 
                ? 'border-red-500' 
                : email.trim() && !errors.email 
                  ? 'border-green-500' 
                  : ''
            }`}
            disabled={isLoading}
          />
          {email.trim() && !errors.email && (
            <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
          )}
        </div>
        {errors.email && (
          <div className="text-xs text-red-600 mt-1">
            {errors.email}
          </div>
        )}
        {email.trim() && !errors.email && (
          <div className="text-xs text-green-600 mt-1">
            ✓ Valid email address
          </div>
        )}
      </div>

      {/* Password Input */}
      <div className="space-y-1">
        <Label htmlFor="password" className="text-xs font-medium">
          Password
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => handlePasswordChange(e.target.value)}
            placeholder="Create a strong password"
            className={`h-10 pl-10 pr-12 text-sm ${errors.password ? 'border-red-500' : ''}`}
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
        {password && (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium ${getPasswordStrengthColor(passwordStrength.strength)}`}>
                {getPasswordStrengthText(passwordStrength.strength)}
              </span>
            </div>
            {passwordStrength.errors.length > 0 && (
              <div className="text-xs text-red-600">
                {passwordStrength.errors.slice(0, 2).map((error, index) => (
                  <div key={index}>• {error}</div>
                ))}
                {passwordStrength.errors.length > 2 && (
                  <div className="text-xs text-gray-500">... and {passwordStrength.errors.length - 2} more</div>
                )}
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

      {/* Confirm Password Input */}
      <div className="space-y-1">
        <Label htmlFor="confirmPassword" className="text-xs font-medium">
          Confirm Password
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => handleConfirmPasswordChange(e.target.value)}
            placeholder="Confirm your password"
            className={`h-10 pl-10 pr-12 text-sm ${
              errors.confirmPassword 
                ? 'border-red-500' 
                : passwordMatchStatus === 'matching' 
                  ? 'border-green-500' 
                  : passwordMatchStatus === 'not-matching' 
                    ? 'border-red-500' 
                    : ''
            }`}
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
        
        {/* Password match status indicator */}
        {passwordMatchStatus !== 'idle' && (
          <div className={`text-xs mt-1 flex items-center gap-1 ${
            passwordMatchStatus === 'matching' ? 'text-green-600' : 'text-red-600'
          }`}>
            {passwordMatchStatus === 'matching' ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Passwords match
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                Passwords do not match
              </>
            )}
          </div>
        )}
        
        {errors.confirmPassword && (
          <div className="text-xs text-red-600 mt-1">
            {errors.confirmPassword}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onSkip}
          disabled={isLoading}
          className="flex-1 h-10 text-sm"
        >
          Skip
        </Button>
        
        <Button
          type="button"
          onClick={handleComplete}
          disabled={isLoading || !passwordStrength.isValid || passwordMatchStatus !== 'matching' || !email.trim()}
          className="flex-1 h-10 text-sm bg-primary text-white"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Setting up...
            </div>
          ) : (
            'Complete Setup'
          )}
        </Button>
      </div>
    </div>
  );
};
