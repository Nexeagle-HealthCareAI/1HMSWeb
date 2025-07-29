import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Lock, Check } from 'lucide-react';
import { ValidationUtils } from '@/utils/validation';

interface ProfileCompletionProps {
  email: string;
  password: string;
  isLoading: boolean;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onComplete: () => void;
  onSkip: () => void;
  onBack: () => void;
}

interface PasswordRequirement {
  label: string;
  met: boolean;
}

export const ProfileCompletion: React.FC<ProfileCompletionProps> = ({
  email,
  password,
  isLoading,
  onEmailChange,
  onPasswordChange,
  onComplete,
  onSkip,
  onBack
}) => {
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [passwordRequirements, setPasswordRequirements] = useState<PasswordRequirement[]>([]);

  // Check password requirements
  useEffect(() => {
    if (!password) {
      setPasswordRequirements([
        { label: '8+ chars', met: false },
        { label: 'Lowercase', met: false },
        { label: 'Uppercase', met: false },
        { label: 'Number', met: false }
      ]);
      return;
    }

    const requirements: PasswordRequirement[] = [
      { label: '8+ chars', met: password.length >= 8 },
      { label: 'Lowercase', met: /[a-z]/.test(password) },
      { label: 'Uppercase', met: /[A-Z]/.test(password) },
      { label: 'Number', met: /\d/.test(password) }
    ];

    setPasswordRequirements(requirements);
  }, [password]);

  // Real-time validation
  useEffect(() => {
    const newErrors: { [key: string]: string } = {};
    
    if (email.trim()) {
      const emailError = ValidationUtils.validateEmail(email);
      if (emailError) newErrors.email = emailError;
      
      // If email is entered, password becomes mandatory
      if (!password) {
        newErrors.password = 'Password is required when email is provided';
      }
    }
    
    if (password) {
      const passwordError = ValidationUtils.validatePasswordWithError(password);
      if (passwordError) newErrors.password = passwordError;
    }
    
    setErrors(newErrors);
  }, [email, password]);

  const handleComplete = () => {
    // Validate required fields
    const newErrors: { [key: string]: string } = {};
    
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else {
      const emailError = ValidationUtils.validateEmail(email);
      if (emailError) newErrors.email = emailError;
      
      // If email is entered, password becomes mandatory
      if (!password) {
        newErrors.password = 'Password is required when email is provided';
      }
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else {
      const passwordError = ValidationUtils.validatePasswordWithError(password);
      if (passwordError) newErrors.password = passwordError;
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    onComplete();
  };

  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="space-y-4">
      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium">
          Email Address
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => {
              onEmailChange(e.target.value);
              clearError('email');
            }}
            placeholder="Enter your email"
            className={`h-10 pl-10 text-sm ${errors.email ? 'border-red-500' : ''}`}
            disabled={isLoading}
          />
        </div>
        {errors.email && (
          <div className="text-xs text-red-600 mt-1">
            {errors.email}
          </div>
        )}
      </div>

      {/* Password */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-sm font-medium">
            Password {email.trim() ? '(Required)' : '(Optional)'}
          </Label>
          {email.trim() && (
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
              Required when email is provided
            </span>
          )}
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => {
              onPasswordChange(e.target.value);
              clearError('password');
            }}
            placeholder="Create a strong password"
            className={`h-10 pl-10 text-sm ${errors.password ? 'border-red-500' : ''}`}
            disabled={isLoading}
          />
        </div>
        
        {/* Password Requirements */}
        {password && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            {passwordRequirements.map((requirement, index) => (
              <div
                key={index}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium ${
                  requirement.met
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-gray-50 text-gray-500 border border-gray-200'
                }`}
              >
                {requirement.met ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : (
                  <div className="h-3 w-3 rounded-full border border-gray-400" />
                )}
                {requirement.label}
              </div>
            ))}
          </div>
        )}
        
        {errors.password && (
          <div className="text-xs text-red-600 mt-1">
            {errors.password}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-3">
        <Button
          variant="outline"
          onClick={onSkip}
          disabled={isLoading}
          className="flex-1 h-10"
        >
          Skip
        </Button>
        
        <Button
          onClick={handleComplete}
          disabled={isLoading || Object.keys(errors).length > 0}
          className="flex-1 h-10 bg-primary text-white"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Completing...
            </div>
          ) : (
            'Complete'
          )}
        </Button>
      </div>
    </div>
  );
}; 