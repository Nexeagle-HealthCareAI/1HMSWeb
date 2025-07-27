import React, { useState, useEffect } from 'react';
import { Check, X, Shield, ArrowLeft, Phone, User, Lock, Sparkles, Star, Award, Zap, Heart, Globe, UserCheck, Crown, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface RegistrationProps {
  onRegister: () => void;
  onSwitchToLogin: () => void;
}

export const Registration: React.FC<RegistrationProps> = ({ onRegister, onSwitchToLogin }) => {
  const { sendOTP: authSendOTP } = useAuth();
  const [step, setStep] = useState(1);
  const [userType, setUserType] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('');
  const [language, setLanguage] = useState('English');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  // Validation states
  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    mobile?: string;
    otp?: string;
  }>({});

  // Password strength validation
  const passwordValidation = {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const passwordStrength = Object.values(passwordValidation).filter(Boolean).length;
  const progressPercentage = step === 1 ? 25 : step === 2 ? 50 : step === 3 ? 75 : 100;

  // Validation functions
  const validateFullName = (name: string): string | undefined => {
    if (!name.trim()) {
      return 'Full name is required';
    }
    if (name.trim().length < 2) {
      return 'Full name must be at least 2 characters';
    }
    if (name.trim().length > 50) {
      return 'Full name must be less than 50 characters';
    }
    if (!/^[a-zA-Z\s]+$/.test(name.trim())) {
      return 'Full name can only contain letters and spaces';
    }
    return undefined;
  };

  const validateEmail = (email: string): string | undefined => {
    if (!email.trim()) {
      return undefined; // Email is optional
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return 'Please enter a valid email address';
    }
    if (email.trim().length > 100) {
      return 'Email must be less than 100 characters';
    }
    return undefined;
  };

  const validatePassword = (password: string): string | undefined => {
    if (!password.trim()) {
      return undefined; // Password is optional
    }
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (password.length > 128) {
      return 'Password must be less than 128 characters';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/\d/.test(password)) {
      return 'Password must contain at least one number';
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return 'Password must contain at least one special character';
    }
    return undefined;
  };

  const validateMobile = (mobile: string): string | undefined => {
    if (!mobile.trim()) {
      return 'Mobile number is required';
    }
    if (!/^\d{10}$/.test(mobile.trim())) {
      return 'Please enter a valid 10-digit mobile number';
    }
    if (!/^[6-9]\d{9}$/.test(mobile.trim())) {
      return 'Mobile number must start with 6, 7, 8, or 9';
    }
    return undefined;
  };

  const validateOTP = (otp: string): string | undefined => {
    if (!otp.trim()) {
      return 'OTP is required';
    }
    if (!/^\d{6}$/.test(otp.trim())) {
      return 'Please enter a valid 6-digit OTP';
    }
    return undefined;
  };

  // Format mobile number
  const formatMobile = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 10) {
      return cleaned;
    }
    return cleaned.slice(0, 10);
  };

  // OTP timer
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Auto-submit OTP when 6 digits entered
  useEffect(() => {
    if (otp.length === 6 && otpSent && !isLoading) {
      verifyOTP();
    }
  }, [otp, otpSent, isLoading]);

  // Real-time validation for full name
  useEffect(() => {
    if (fullName && step === 3) {
      const error = validateFullName(fullName);
      setErrors(prev => ({ ...prev, fullName: error }));
    }
  }, [fullName, step]);

  // Real-time validation for email
  useEffect(() => {
    if (email && step === 3) {
      const error = validateEmail(email);
      setErrors(prev => ({ ...prev, email: error }));
    }
  }, [email, step]);

  // Real-time validation for password
  useEffect(() => {
    if (password && step === 3) {
      const error = validatePassword(password);
      setErrors(prev => ({ ...prev, password: error }));
    }
  }, [password, step]);

  const handleUserTypeSelection = (type: string) => {
    // Store role in the correct format
    const role = type === 'doctor' ? 'Admin,Doctor' : 'Admin Only';
    setUserType(role);
    setStep(2);
    toast({
      title: "Great Choice! 🎯",
      description: `Selected: ${type === 'doctor' ? 'Doctor & Admin' : 'Admin Only'}`
    });
  };

  const sendOTP = async () => {
    // Validate mobile number
    const mobileError = validateMobile(mobile);
    if (mobileError) {
      setErrors(prev => ({ ...prev, mobile: mobileError }));
      toast({
        title: "Invalid Mobile",
        description: mobileError,
        variant: "destructive"
      });
      return;
    }

    // Clear mobile error if validation passes
    setErrors(prev => ({ ...prev, mobile: undefined }));

    setIsLoading(true);
    try {
      // First call sign-up API
      const { AuthService } = await import('@/services/authService');
      const signUpResponse = await AuthService.signUp(mobile, userType);
      
      // Store userId from signup response
      if (signUpResponse.userId) {
        setUserId(signUpResponse.userId);
      }
      
      // Then generate OTP
      await authSendOTP(mobile);
      setOtpSent(true);
      setResendTimer(30);
      toast({
        title: "OTP Sent! 🚀",
        description: `Verification code sent to +91 ${mobile}`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send OTP. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOTP = async () => {
    console.log('verifyOTP called with OTP:', otp, 'Mobile:', mobile);
    
    // Validate OTP
    const otpError = validateOTP(otp);
    if (otpError) {
      console.log('OTP validation error:', otpError);
      setErrors(prev => ({ ...prev, otp: otpError }));
      toast({
        title: "Invalid OTP",
        description: otpError,
        variant: "destructive"
      });
      return;
    }

    // Clear OTP error if validation passes
    setErrors(prev => ({ ...prev, otp: undefined }));

    setIsLoading(true);
    try {
      console.log('Calling AuthService.checkOTP...');
      const { AuthService } = await import('@/services/authService');
      const response = await AuthService.checkOTP(mobile, otp);
      
      console.log('OTP check response:', response);
      
      if (response.success) {
        setStep(3);
        toast({
          title: "Mobile Verified! ✅",
          description: "Almost done! Set up your profile"
        });
      } else {
        throw new Error(response.message || 'OTP verification failed');
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to verify OTP. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    if (!userId) {
      toast({
        title: "Error",
        description: "User ID not found. Please try again.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { AuthService } = await import('@/services/authService');
      await AuthService.updateUserProfile({
        userId: userId,
        email: '',
        password: '',
        fullName: 'User', // Default name
        gender: 'Not Specified',
        language: 'English',
        profilePictureUrl: ''
      });
      
      toast({
        title: "Welcome to NexEagle! 🎉",
        description: "Account created successfully! You can add email later."
      });
      onRegister();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create account. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalStep = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    const fullNameError = validateFullName(fullName);
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    
    // Check for validation errors
    const newErrors: typeof errors = {};
    if (fullNameError) newErrors.fullName = fullNameError;
    if (emailError) newErrors.email = emailError;
    if (passwordError) newErrors.password = passwordError;
    
    // Update errors state
    setErrors(newErrors);
    
    // If there are validation errors, show the first one
    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0];
      toast({
        title: "Validation Error",
        description: firstError,
        variant: "destructive"
      });
      return;
    }

    if (!userId) {
      toast({
        title: "Error",
        description: "User ID not found. Please try again.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { AuthService } = await import('@/services/authService');
      await AuthService.updateUserProfile({
        userId: userId,
        email: email.trim(),
        password: password,
        fullName: fullName.trim(),
        gender: gender || 'Not Specified',
        language: language || 'English',
        profilePictureUrl: '' // Can be updated later
      });
      
      toast({
        title: "Welcome to NexEagle! 🎉",
        description: "Your account has been created successfully"
      });
      onRegister();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create account. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const userTypes = [
    {
      id: 'doctor',
      title: 'Doctor & Admin',
      subtitle: 'Full access to all features',
      description: 'Manage patients, appointments, prescriptions, billing & admin functions',
      icon: UserCheck,
      color: 'from-blue-500 to-cyan-500',
      benefits: ['Patient Management', 'E-Prescriptions', 'Appointment Booking', 'Billing & Reports', 'Admin Dashboard']
    },
    {
      id: 'admin',
      title: 'Admin Only',
      subtitle: 'Administrative access',
      description: 'Handle appointments, billing, reports and administrative tasks',
      icon: Crown,
      color: 'from-purple-500 to-pink-500',
      benefits: ['Appointment Management', 'Billing & Invoicing', 'Reports & Analytics', 'User Management', 'System Settings']
    }
  ];

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex overflow-hidden">
      {/* Left side - Benefits & Promotional */}
      <div className="hidden lg:flex w-2/3 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-white/5" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              backgroundSize: '60px 60px'
            }}></div>
          </div>
        </div>
        
        <div className="relative z-10 flex flex-col justify-center p-8 text-white max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                <img src="/Images/77834bc6-d9bc-41d2-8676-026af7cf79bc.png" alt="Company Logo" className="h-10 w-10" />
              </div>
              <h1 className="text-4xl font-bold">Join NexEagle</h1>
            </div>
            
            <p className="text-lg opacity-90 mb-6">
              The most advanced Hospital Management System trusted by thousands of healthcare professionals worldwide
            </p>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="text-center p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                <div className="text-2xl font-bold">10K+</div>
                <div className="text-sm opacity-80">Active Doctors</div>
              </div>
              <div className="text-center p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                <div className="text-2xl font-bold">1M+</div>
                <div className="text-sm opacity-80">Patients Served</div>
              </div>
              <div className="text-center p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                <div className="text-2xl font-bold">99.9%</div>
                <div className="text-sm opacity-80">Uptime</div>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="mt-6 p-4 bg-gradient-to-r from-yellow-400/20 to-orange-400/20 backdrop-blur-sm rounded-2xl border border-white/20">
            <div className="flex items-center gap-2 mb-1">
              <Star className="h-4 w-4 text-yellow-300" />
              <span className="font-semibold text-sm">Limited Time Offer</span>
            </div>
            <p className="text-xs opacity-90">
              🎉 First 100 doctors get <strong>3 months FREE</strong> premium features!
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Registration Form */}
      <div className="w-full lg:w-1/3 flex items-center justify-center p-4 lg:p-6 overflow-y-auto">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 backdrop-blur-xl">
          <CardHeader className="text-center space-y-3 pb-4">
            {/* Back Button */}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={step === 1 ? onSwitchToLogin : () => setStep(step - 1)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="text-right">
                <div className="text-xs text-muted-foreground mb-1">Step {step} of 3</div>
                <Progress value={progressPercentage} className="w-16 h-2" />
              </div>
            </div>
            
            {/* Header */}
            <div className="space-y-2">
              <div className="flex justify-center">
                <div className="p-3 bg-white rounded-xl shadow-lg">
                  <img src="/Images/77834bc6-d9bc-41d2-8676-026af7cf79bc.png" alt="Company Logo" className="h-10 w-10" />
                </div>
              </div>
              
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {step === 1 && "Choose Your Role"}
                {step === 2 && "Quick Verification"}
                {step === 3 && "Almost Done!"}
              </CardTitle>
              
              <p className="text-muted-foreground text-sm">
                {step === 1 && "Select the access level that suits you best"}
                {step === 2 && "Secure your account with mobile verification"}
                {step === 3 && "Set up email & password (optional)"}
              </p>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Step 1: User Type Selection */}
            {step === 1 && (
              <div className="space-y-3 animate-fade-in">
                {userTypes.map((type) => (
                  <div
                    key={type.id}
                    onClick={() => handleUserTypeSelection(type.id)}
                    className="group cursor-pointer transform transition-all duration-300 hover:scale-105"
                  >
                    <Card className="border-2 border-transparent hover:border-blue-300 hover:shadow-lg transition-all duration-300">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg bg-gradient-to-br ${type.color} shadow-md group-hover:shadow-lg transition-shadow`}>
                            <type.icon className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-base text-gray-900 group-hover:text-blue-600 transition-colors">
                              {type.title}
                            </h3>
                            <p className="text-sm text-blue-600 font-medium mb-1">{type.subtitle}</p>
                            <p className="text-sm text-gray-600 mb-2">{type.description}</p>
                            <div className="flex flex-wrap gap-1">
                              {type.benefits.slice(0, 2).map((benefit, idx) => (
                                <span key={idx} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                                  {benefit}
                                </span>
                              ))}
                              {type.benefits.length > 2 && (
                                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                                  +{type.benefits.length - 2} more
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            )}

            {/* Step 2: Mobile Verification */}
            {step === 2 && (
              <div className="space-y-3 animate-fade-in">
                <div className="space-y-2">
                  <Label htmlFor="mobile" className="text-sm font-medium">Mobile Number</Label>
                  <div className="flex">
                    <div className="flex items-center px-3 bg-gradient-to-r from-gray-50 to-gray-100 border border-r-0 rounded-l-lg">
                      <span className="text-sm font-semibold text-gray-700">+91</span>
                    </div>
                    <Input
                      id="mobile"
                      type="tel"
                      value={mobile}
                      onChange={(e) => setMobile(formatMobile(e.target.value))}
                      placeholder="Enter mobile number"
                      className={`h-11 rounded-l-none border-l-0 focus:ring-2 focus:ring-blue-500 text-base ${
                        errors.mobile ? 'border-red-500 focus:ring-red-500' : ''
                      }`}
                      maxLength={10}
                    />
                  </div>
                  {errors.mobile && (
                    <div className="flex items-center gap-2 text-sm text-red-600 animate-fade-in">
                      <X className="h-4 w-4" />
                      <span>{errors.mobile}</span>
                    </div>
                  )}
                  {mobile.length === 10 && !errors.mobile && (
                    <div className="flex items-center gap-2 text-sm text-green-600 animate-fade-in">
                      <Check className="h-4 w-4" />
                      <span>Valid mobile number</span>
                    </div>
                  )}
                </div>

                {!otpSent && (
                  <Button 
                    onClick={sendOTP}
                    disabled={mobile.length !== 10 || isLoading}
                    className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-lg transition-all duration-200"
                  >
                    {isLoading ? "Sending OTP..." : "Send OTP"}
                  </Button>
                )}

                {otpSent && (
                  <div className="space-y-2 animate-fade-in">
                    <Label htmlFor="otp" className="text-sm font-medium">Enter OTP</Label>
                    <Input
                      id="otp"
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="• • • • • •"
                      className={`h-11 text-center text-xl tracking-[0.3em] font-bold focus:ring-2 focus:ring-blue-500 ${
                        errors.otp ? 'border-red-500 focus:ring-red-500' : ''
                      }`}
                      maxLength={6}
                    />
                    {errors.otp && (
                      <div className="flex items-center gap-2 text-sm text-red-600 animate-fade-in">
                        <X className="h-4 w-4" />
                        <span>{errors.otp}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">
                        Sent to +91 {mobile}
                      </span>
                      {resendTimer > 0 ? (
                        <span className="text-blue-600 font-medium">
                          Resend in {resendTimer}s
                        </span>
                      ) : (
                        <Button
                          variant="link"
                          size="sm"
                          onClick={sendOTP}
                          className="p-0 h-auto text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Resend OTP
                        </Button>
                      )}
                    </div>

                    <Button 
                      onClick={verifyOTP}
                      disabled={otp.length !== 6 || isLoading}
                      className="w-full h-11 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-lg shadow-lg transition-all duration-200"
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Verifying...
                        </div>
                      ) : (
                        "Verify OTP"
                      )}
                    </Button>
                  </div>
                )}

                {isLoading && otpSent && (
                  <div className="text-center py-4">
                    <div className="inline-flex items-center gap-3 text-blue-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span className="font-medium text-sm">Verifying...</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Profile Setup */}
            {step === 3 && (
              <div className="space-y-3 animate-fade-in">
                <div className="text-center mb-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700">
                    <strong>Complete your profile:</strong> Add your details to get started
                  </p>
                </div>

                <form onSubmit={handleFinalStep} className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-sm font-medium">Full Name *</Label>
                    <Input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      className={`h-11 focus:ring-2 focus:ring-blue-500 ${
                        errors.fullName ? 'border-red-500 focus:ring-red-500' : ''
                      }`}
                      required
                    />
                    {errors.fullName && (
                      <div className="flex items-center gap-2 text-sm text-red-600 animate-fade-in">
                        <X className="h-4 w-4" />
                        <span>{errors.fullName}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gender" className="text-sm font-medium">Gender</Label>
                    <select
                      id="gender"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="h-11 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Not Specified">Prefer not to say</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="language" className="text-sm font-medium">Preferred Language</Label>
                    <select
                      id="language"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="h-11 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="English">English</option>
                      <option value="Hindi">Hindi</option>
                      <option value="Spanish">Spanish</option>
                      <option value="French">French</option>
                      <option value="German">German</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">Email Address (Optional)</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className={`h-11 focus:ring-2 focus:ring-blue-500 ${
                        errors.email ? 'border-red-500 focus:ring-red-500' : ''
                      }`}
                    />
                    {errors.email && (
                      <div className="flex items-center gap-2 text-sm text-red-600 animate-fade-in">
                        <X className="h-4 w-4" />
                        <span>{errors.email}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">Password (Optional)</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a secure password"
                      className={`h-11 focus:ring-2 focus:ring-blue-500 ${
                        errors.password ? 'border-red-500 focus:ring-red-500' : ''
                      }`}
                    />
                    
                    {errors.password && (
                      <div className="flex items-center gap-2 text-sm text-red-600 animate-fade-in">
                        <X className="h-4 w-4" />
                        <span>{errors.password}</span>
                      </div>
                    )}
                    
                    {password && !errors.password && (
                      <div className="space-y-2 mt-2">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {Object.entries({
                            '8+ chars': passwordValidation.minLength,
                            'Uppercase': passwordValidation.hasUpper,
                            'Lowercase': passwordValidation.hasLower,
                            'Number': passwordValidation.hasNumber,
                            'Special': passwordValidation.hasSpecial,
                          }).map(([label, valid]) => (
                            <div key={label} className={`flex items-center gap-2 p-1.5 rounded-lg ${valid ? 'text-green-700 bg-green-50' : 'text-gray-500 bg-gray-50'}`}>
                              {valid ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                              <span className="font-medium">{label}</span>
                            </div>
                          ))}
                        </div>
                        <div className="text-xs text-gray-600">
                          Password strength: {passwordStrength < 3 ? 'Weak' : passwordStrength < 5 ? 'Medium' : 'Strong'}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <Button 
                      type="button"
                      onClick={handleSkip}
                      variant="outline"
                      className="flex-1 h-11 font-semibold border-2 hover:bg-gray-50 hover:text-gray-900 text-gray-700"
                      disabled={isLoading}
                    >
                      Skip for Now
                    </Button>
                    
                    <Button 
                      type="submit" 
                      className="flex-1 h-11 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-lg shadow-lg transition-all duration-200"
                      disabled={isLoading || !fullName || Object.keys(errors).some(key => errors[key as keyof typeof errors]) || (password && passwordStrength < 5)}
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Creating...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          Complete Setup
                        </div>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Login Link */}
            <div className="text-center pt-3 border-t">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Button
                  variant="link"
                  className="p-0 h-auto text-blue-600 hover:text-blue-700 font-semibold"
                  onClick={onSwitchToLogin}
                >
                  Sign in here
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};