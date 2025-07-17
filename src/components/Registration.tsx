import React, { useState, useEffect } from 'react';
import { Check, X, Shield, ArrowLeft, Phone, User, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';

interface RegistrationProps {
  onRegister: () => void;
  onSwitchToLogin: () => void;
}

export const Registration: React.FC<RegistrationProps> = ({ onRegister, onSwitchToLogin }) => {
  const [step, setStep] = useState(1);
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Password strength validation
  const passwordValidation = {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };

  const passwordStrength = Object.values(passwordValidation).filter(Boolean).length;

  // Format mobile number
  const formatMobile = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 10) {
      return cleaned;
    }
    return cleaned.slice(0, 10);
  };

  // Auto-send OTP when valid mobile is entered
  useEffect(() => {
    if (mobile.length === 10 && !otpSent) {
      sendOTP();
    }
  }, [mobile]);

  // OTP timer
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Auto-submit OTP when 6 digits entered
  useEffect(() => {
    if (otp.length === 6) {
      verifyOTP();
    }
  }, [otp]);

  const sendOTP = async () => {
    setIsLoading(true);
    // Simulate OTP sending
    setTimeout(() => {
      setIsLoading(false);
      setOtpSent(true);
      setResendTimer(30);
      toast({
        title: "OTP Sent!",
        description: `Verification code sent to +91 ${mobile}`
      });
    }, 1000);
  };

  const verifyOTP = async () => {
    setIsLoading(true);
    // Simulate OTP verification
    setTimeout(() => {
      setIsLoading(false);
      setStep(2);
      toast({
        title: "Mobile Verified!",
        description: "Please complete your profile"
      });
    }, 1000);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!doctorName || !password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    if (passwordStrength < 3) {
      toast({
        title: "Weak Password",
        description: "Please create a stronger password",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Registration Successful!",
        description: "Welcome to NexEagle easyHMS"
      });
      onRegister();
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex">
      {/* Left side - Registration Form */}
      <div className="w-full lg:w-1/3 flex items-center justify-center p-8">
        <Card className="w-full max-w-md shadow-elegant">
          <CardHeader className="text-center space-y-2">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={onSwitchToLogin}
                className="p-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex justify-center">
                <div className="p-3 bg-gradient-primary rounded-full">
                  <Shield className="h-8 w-8 text-white" />
                </div>
              </div>
              <div className="w-8" />
            </div>
            
            <CardTitle className="text-2xl font-bold text-healthcare-primary">
              {step === 1 ? "Quick Registration" : "Complete Profile"}
            </CardTitle>
            <p className="text-muted-foreground">
              {step === 1 ? "Lightning fast onboarding" : "Just 2 more fields!"}
            </p>
          </CardHeader>
          
          <CardContent>
            {step === 1 ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mobile">Mobile Number</Label>
                  <div className="flex">
                    <div className="flex items-center px-3 bg-muted border border-r-0 rounded-l-md">
                      <span className="text-sm font-medium">+91</span>
                    </div>
                    <Input
                      id="mobile"
                      type="tel"
                      value={mobile}
                      onChange={(e) => setMobile(formatMobile(e.target.value))}
                      placeholder="Enter mobile number"
                      className="h-11 rounded-l-none"
                      maxLength={10}
                    />
                  </div>
                  {mobile.length === 10 && (
                    <div className="flex items-center gap-2 text-sm text-healthcare-success">
                      <Check className="h-4 w-4" />
                      <span>Valid mobile number</span>
                    </div>
                  )}
                </div>

                {otpSent && (
                  <div className="space-y-2">
                    <Label htmlFor="otp">Enter OTP</Label>
                    <Input
                      id="otp"
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="6-digit OTP"
                      className="h-11 text-center text-lg tracking-widest"
                      maxLength={6}
                    />
                    
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">
                        Sent to +91 {mobile}
                      </span>
                      {resendTimer > 0 ? (
                        <span className="text-muted-foreground">
                          Resend in {resendTimer}s
                        </span>
                      ) : (
                        <Button
                          variant="link"
                          size="sm"
                          onClick={sendOTP}
                          className="p-0 h-auto text-healthcare-primary"
                        >
                          Resend OTP
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {isLoading && (
                  <div className="text-center py-4">
                    <div className="inline-flex items-center gap-2 text-healthcare-primary">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-healthcare-primary"></div>
                      {!otpSent ? "Sending OTP..." : "Verifying..."}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="doctorName">Doctor Name</Label>
                  <Input
                    id="doctorName"
                    type="text"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    placeholder="e.g. Dr. Ravi Mehta"
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Create Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className="h-11"
                  />
                  
                  {password && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs">
                        {Object.entries({
                          '8+ characters': passwordValidation.minLength,
                          'Uppercase': passwordValidation.hasUpper,
                          'Lowercase': passwordValidation.hasLower,
                          'Number': passwordValidation.hasNumber,
                          'Special char': passwordValidation.hasSpecial
                        }).map(([label, valid]) => (
                          <div key={label} className={`flex items-center gap-1 ${valid ? 'text-healthcare-success' : 'text-muted-foreground'}`}>
                            {valid ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                            <span>{label}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full ${
                              i <= passwordStrength
                                ? i <= 2 ? 'bg-healthcare-error' : i <= 3 ? 'bg-healthcare-warning' : 'bg-healthcare-success'
                                : 'bg-muted'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-11 bg-gradient-primary text-white font-semibold"
                  disabled={isLoading || passwordStrength < 3}
                >
                  {isLoading ? "Creating Account..." : "Create Account"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right side - Benefits */}
      <div className="hidden lg:flex w-2/3 bg-gradient-secondary items-center justify-center p-12">
        <div className="text-white max-w-2xl">
          <h1 className="text-4xl font-bold mb-6">Join NexEagle easyHMS</h1>
          
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <Phone className="h-6 w-6 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-lg">OTP-Based Registration</h3>
                <p className="opacity-90">Instant verification with mobile OTP. No email required!</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <User className="h-6 w-6 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-lg">Progressive Profiling</h3>
                <p className="opacity-90">Complete your profile gradually. Start using immediately!</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <Lock className="h-6 w-6 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-lg">Secure & Fast</h3>
                <p className="opacity-90">Enterprise-grade security with lightning-fast performance</p>
              </div>
            </div>
          </div>
          
          <div className="mt-8 p-4 bg-white/10 rounded-lg">
            <p className="text-sm opacity-90">
              💡 Tip: Most doctors complete their profile in under 2 minutes and get verified within 24 hours!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};