import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Mail, Lock, ArrowLeft } from 'lucide-react';
import { ValidationUtils } from '@/utils/validation';

interface ProfileCompletionProps {
  fullName: string;
  email: string;
  password: string;
  gender: string;
  language: string;
  isLoading: boolean;
  onFullNameChange: (name: string) => void;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onGenderChange: (gender: string) => void;
  onLanguageChange: (language: string) => void;
  onComplete: () => void;
  onSkip: () => void;
  onBack: () => void;
}

export const ProfileCompletion: React.FC<ProfileCompletionProps> = ({
  fullName,
  email,
  password,
  gender,
  language,
  isLoading,
  onFullNameChange,
  onEmailChange,
  onPasswordChange,
  onGenderChange,
  onLanguageChange,
  onComplete,
  onSkip,
  onBack
}) => {
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [passwordStrength, setPasswordStrength] = useState<{ score: number; label: string; color: string }>({ score: 0, label: '', color: '' });

  // Real-time validation
  useEffect(() => {
    const newErrors: { [key: string]: string } = {};
    
    if (fullName.trim()) {
      const nameError = ValidationUtils.validateFullName(fullName);
      if (nameError) newErrors.fullName = nameError;
    }
    
    if (email.trim()) {
      const emailError = ValidationUtils.validateEmail(email);
      if (emailError) newErrors.email = emailError;
    }
    
    if (password) {
      const passwordError = ValidationUtils.validatePasswordWithError(password);
      if (passwordError) newErrors.password = passwordError;
    }
    
    setErrors(newErrors);
  }, [fullName, email, password]);

  // Password strength indicator
  useEffect(() => {
    if (!password) {
      setPasswordStrength({ score: 0, label: '', color: '' });
      return;
    }

    const strength = ValidationUtils.validatePassword(password);
    const score = 5 - strength.errors.length; // Calculate score based on errors
    let label = '';
    let color = '';
    
    switch (strength.strength) {
      case 'weak':
        label = 'Weak';
        color = 'bg-red-500';
        break;
      case 'medium':
        label = 'Medium';
        color = 'bg-yellow-500';
        break;
      case 'strong':
        label = 'Strong';
        color = 'bg-green-500';
        break;
    }
    
    setPasswordStrength({
      score,
      label,
      color
    });
  }, [password]);

  const handleComplete = () => {
    // Validate all fields
    const newErrors: { [key: string]: string } = {};
    
    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else {
      const nameError = ValidationUtils.validateFullName(fullName);
      if (nameError) newErrors.fullName = nameError;
    }
    
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else {
      const emailError = ValidationUtils.validateEmail(email);
      if (emailError) newErrors.email = emailError;
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
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          Complete Your Profile
        </h2>
        <p className="text-sm text-gray-600">
          Add your details to complete registration
        </p>
      </div>

      {/* Full Name */}
      <div className="space-y-2">
        <Label htmlFor="fullName" className="text-sm font-medium">
          Full Name
        </Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => {
              onFullNameChange(e.target.value);
              clearError('fullName');
            }}
            placeholder="Enter your full name"
            className={`h-10 pl-10 text-sm ${errors.fullName ? 'border-red-500' : ''}`}
            disabled={isLoading}
          />
        </div>
        {errors.fullName && (
          <div className="text-xs text-red-600 mt-1">
            {errors.fullName}
          </div>
        )}
      </div>

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
        <Label htmlFor="password" className="text-sm font-medium">
          Password
        </Label>
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
        {password && (
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${passwordStrength.color}`}
                style={{ width: `${(passwordStrength.score / 4) * 100}%` }}
              />
            </div>
            <span className={`text-xs font-medium ${passwordStrength.color}`}>
              {passwordStrength.label}
            </span>
          </div>
        )}
        {errors.password && (
          <div className="text-xs text-red-600 mt-1">
            {errors.password}
          </div>
        )}
      </div>

      {/* Gender */}
      <div className="space-y-2">
        <Label htmlFor="gender" className="text-sm font-medium">
          Gender
        </Label>
        <Select value={gender} onValueChange={onGenderChange} disabled={isLoading}>
          <SelectTrigger className="h-10 text-sm">
            <SelectValue placeholder="Select gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Male">Male</SelectItem>
            <SelectItem value="Female">Female</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Language */}
      <div className="space-y-2">
        <Label htmlFor="language" className="text-sm font-medium">
          Preferred Language
        </Label>
        <Select value={language} onValueChange={onLanguageChange} disabled={isLoading}>
          <SelectTrigger className="h-10 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="English">English</SelectItem>
            <SelectItem value="Hindi">Hindi</SelectItem>
            <SelectItem value="Spanish">Spanish</SelectItem>
            <SelectItem value="French">French</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-3">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isLoading}
          className="flex-1 h-10"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
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