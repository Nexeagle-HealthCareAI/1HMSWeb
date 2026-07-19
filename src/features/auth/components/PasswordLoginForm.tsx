import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ValidationUtils } from '@/utils/validation';

interface PasswordLoginFormProps {
  onLogin: (userid: string, password: string) => Promise<void>;
  onSwitchToOTP: () => void;
  onForgotPassword: () => void;
  isLoading: boolean;
  failedAttempts: number;
  isLocked: boolean;
  lockoutTimeRemaining?: number; // Made optional since it's not used
}

export const PasswordLoginForm: React.FC<PasswordLoginFormProps> = ({
  onLogin,
  onSwitchToOTP,
  onForgotPassword,
  isLoading,
  failedAttempts,
  isLocked
}) => {
  const [userid, setUserid] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLocked) {
      return;
    }

    const sanitizedUserid = ValidationUtils.sanitizeInput(userid);
    const sanitizedPassword = ValidationUtils.sanitizeInput(password);

    if (!sanitizedUserid || !sanitizedPassword) {
      return;
    }

    await onLogin(sanitizedUserid, sanitizedPassword);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="userid" className="text-sm font-medium">
          Mobile Number or Email
        </Label>
        <Input
          id="userid"
          type="text"
          value={userid}
          onChange={(e) => setUserid(ValidationUtils.sanitizeInput(e.target.value))}
          placeholder="Enter mobile number or email"
          className={`h-12 text-base ${failedAttempts > 0 ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
          disabled={isLoading || isLocked}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium">
          Password
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(ValidationUtils.sanitizeInput(e.target.value))}
            placeholder="Enter your password"
            className={`h-12 pr-12 text-base ${failedAttempts > 0 ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
            disabled={isLoading || isLocked}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-4 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
            disabled={isLoading || isLocked}
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      <div className="flex flex-row justify-between items-center">
        <Button
          type="button"
          variant="link"
          className="p-0 h-auto text-sm text-primary"
          onClick={onSwitchToOTP}
          disabled={isLoading || isLocked}
        >
          Login with OTP
        </Button>
        <Button
          type="button"
          variant="link"
          className="p-0 h-auto text-sm text-healthcare-primary"
          onClick={onForgotPassword}
          disabled={isLoading || isLocked}
        >
          Forgot Password?
        </Button>
      </div>

      {/* Failed attempts warning */}
      {failedAttempts > 0 && failedAttempts < 5 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800 font-medium">
            ❌ Invalid credentials. {5 - failedAttempts} login attempt{5 - failedAttempts !== 1 ? 's' : ''} remaining before account lockout
          </p>
        </div>
      )}

      <Button 
        type="submit" 
        className="w-full h-12 bg-gradient-primary text-white font-semibold text-base rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
        disabled={isLoading || isLocked}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Signing in...
          </div>
        ) : (
          "Login"
        )}
      </Button>
    </form>
  );
}; 