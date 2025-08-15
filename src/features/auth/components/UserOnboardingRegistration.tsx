import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useAuthApi } from '@/hooks/useApi';
import { ValidationUtils } from '@/utils/validation';

interface UserOnboardingData {
  fullName: string;
  userRole: string;
  mobileNumber: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const userRoles = [
  { value: 'Admin', label: 'Administrator' },
  { value: 'AdminDoctor', label: 'Admin Doctor' },
  { value: 'Doctor', label: 'Doctor' },
  { value: 'Receptionist', label: 'Receptionist' },
  { value: 'Nurse', label: 'Nurse' },
  { value: 'LabTechnician', label: 'Lab Technician' },
  { value: 'Pharmacist', label: 'Pharmacist' }
];

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

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobileVerified, setIsMobileVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  // API hooks
  const sendOTPMutation = useAuthApi.sendOTP();
  const verifyOTPMutation = useAuthApi.verifyOTP();
  const registerMutation = useAuthApi.onboardingRegister();

  // Fetch user data from token on component mount
  useEffect(() => {
    // For now, disable token requirement
    fetchUserDataFromToken();
  }, []);

  const fetchUserDataFromToken = async () => {
    try {
      setIsLoading(true);
      // For now, just set loading to false without pre-filling data
      // Users can enter their own mobile number and role
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast({
        title: "Error",
        description: "Failed to load user data. Please try again.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (!formData.mobileNumber) {
      toast({
        title: "Mobile Number Required",
        description: "Please enter a mobile number first.",
        variant: "destructive"
      });
      return;
    }

    try {
      setOtpLoading(true);
      const cleanMobile = ValidationUtils.cleanMobileNumber(formData.mobileNumber);
      
      const response = await sendOTPMutation.mutateAsync({
        mobileNumber: cleanMobile
      });

      if (response.success) {
        setOtpSent(true);
        toast({
          title: "OTP Sent",
          description: "Please check your mobile for the verification code"
        });
      } else {
        throw new Error(response.message || 'Failed to send OTP');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send OTP. Please try again.",
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
        setIsMobileVerified(true);
        toast({
          title: "Mobile Verified",
          description: "Your mobile number has been successfully verified!",
        });
      } else {
        throw new Error(response.message || 'Invalid OTP');
      }
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid OTP. Please try again.",
        variant: "destructive"
      });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
      
      const response = await registerMutation.mutateAsync({
        fullName: formData.fullName,
        userRole: formData.userRole,
        mobileNumber: ValidationUtils.cleanMobileNumber(formData.mobileNumber),
        email: formData.email || undefined,
        password: formData.password,
        onboardingToken: token || 'dummy-token' // For now, use dummy token if none provided
      });

      if (response.success) {
        toast({
          title: "Registration Successful",
          description: "Your account has been created successfully!",
        });
        
        // Redirect to login page
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to create account. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: keyof UserOnboardingData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
        <div className="text-center space-y-3 sm:space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-base sm:text-lg font-medium text-gray-700">Loading your onboarding form...</p>
          <p className="text-xs sm:text-sm text-gray-500">Please wait while we prepare your registration details</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-4 sm:py-8 px-3 sm:px-4">
      <div className="max-w-4xl mx-auto">
                 {/* Header */}
         <div className="text-center mb-6 sm:mb-8">
           <div className="flex items-center justify-center mb-3 sm:mb-4">
             <img 
               src="/Logo.png" 
               alt="NexEagle Logo" 
               className="h-10 w-auto sm:h-12 mr-2 sm:mr-3"
             />
             <h1 className="text-xl sm:text-2xl font-bold text-gray-900">NexEagle</h1>
           </div>
           <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-1 sm:mb-2">User Onboarding Form</h2>
           <p className="text-sm sm:text-base text-gray-600">Complete your account setup</p>
         </div>



        {/* Registration Form */}
        <Card className="shadow-lg border-0">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg font-semibold text-center text-gray-800">
              Complete Your Registration
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Left Column: Name, User Role, Email */}
                <div className="space-y-4 sm:space-y-6">
                  {/* Full Name */}
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="flex items-center gap-2 text-sm font-medium">
                      <User className="h-4 w-4" />
                      Full Name *
                    </Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => updateFormData('fullName', e.target.value)}
                      placeholder="Enter your full name"
                      className="h-10 sm:h-11 text-sm sm:text-base"
                      required
                    />
                  </div>

                  {/* User Role */}
                  <div className="space-y-2">
                    <Label htmlFor="userRole" className="flex items-center gap-2 text-sm font-medium">
                      <Shield className="h-4 w-4" />
                      User Role *
                    </Label>
                    <Select
                      value={formData.userRole}
                      onValueChange={(value) => updateFormData('userRole', value)}
                    >
                      <SelectTrigger className="h-10 sm:h-11 text-sm sm:text-base">
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        {userRoles.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2 text-sm font-medium">
                      <Mail className="h-4 w-4" />
                      Email Address
                      <span className="text-xs text-gray-500">(Optional)</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateFormData('email', e.target.value)}
                      placeholder="Enter email address"
                      className="h-10 sm:h-11 text-sm sm:text-base"
                    />
                  </div>
                </div>

                {/* Right Column: Mobile Number & Verification, Password */}
                <div className="space-y-4 sm:space-y-6">
                  {/* Mobile Number */}
                  <div className="space-y-2">
                    <Label htmlFor="mobileNumber" className="flex items-center gap-2 text-sm font-medium">
                      <Phone className="h-4 w-4" />
                      Mobile Number *
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="mobileNumber"
                        value={formData.mobileNumber}
                        onChange={(e) => updateFormData('mobileNumber', e.target.value)}
                        placeholder="Enter mobile number"
                        className="h-10 sm:h-11 flex-1 text-sm sm:text-base"
                        required
                      />
                      <Button
                        type="button"
                        onClick={handleSendOTP}
                        disabled={otpLoading || !formData.mobileNumber || isMobileVerified}
                        className="h-10 sm:h-11 px-3 sm:px-4 text-sm sm:text-base whitespace-nowrap"
                        variant={isMobileVerified ? "secondary" : "default"}
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

                                         {!isMobileVerified && formData.mobileNumber && (
                       <p className="text-xs text-blue-600 flex items-center gap-1">
                         <Phone className="h-3 w-3" />
                         Click "Send OTP" to verify your mobile number
                       </p>
                     )}
                     {isMobileVerified && (
                       <p className="text-xs text-green-600 flex items-center gap-1">
                         <CheckCircle className="h-3 w-3" />
                         Mobile number verified successfully
                       </p>
                     )}
                  </div>

                  {/* OTP Verification */}
                  {otpSent && !isMobileVerified && (
                    <div className="space-y-2 p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <Label htmlFor="otp" className="text-sm font-medium text-blue-800">
                        Enter OTP sent to your mobile
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="otp"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          placeholder="Enter 6-digit OTP"
                          className="h-10 sm:h-11 flex-1 text-sm sm:text-base"
                          maxLength={6}
                        />
                        <Button
                          type="button"
                          onClick={handleVerifyOTP}
                          disabled={otpLoading || otp.length !== 6}
                          className="h-10 sm:h-11 px-3 sm:px-4 text-sm sm:text-base"
                        >
                          Verify
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Password */}
                  <div className="space-y-2">
                    <Label htmlFor="password" className="flex items-center gap-2 text-sm font-medium">
                      <Lock className="h-4 w-4" />
                      Password *
                      {!isMobileVerified && (
                        <span className="text-xs text-orange-600 ml-1">(Verify mobile first)</span>
                      )}
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => updateFormData('password', e.target.value)}
                        placeholder={isMobileVerified ? "Set your password" : "Verify mobile number first"}
                        className={`h-10 sm:h-11 pr-10 text-sm sm:text-base ${!isMobileVerified ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''}`}
                        required
                        disabled={!isMobileVerified}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-10 sm:h-11 px-2 sm:px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={!isMobileVerified}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">Minimum 8 characters</p>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="flex items-center gap-2 text-sm font-medium">
                      <Lock className="h-4 w-4" />
                      Confirm Password *
                      {!isMobileVerified && (
                        <span className="text-xs text-orange-600 ml-1">(Verify mobile first)</span>
                      )}
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                        placeholder={isMobileVerified ? "Confirm your password" : "Verify mobile number first"}
                        className={`h-10 sm:h-11 pr-10 text-sm sm:text-base ${!isMobileVerified ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''}`}
                        required
                        disabled={!isMobileVerified}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-10 sm:h-11 px-2 sm:px-3 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        disabled={!isMobileVerified}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                      <p className="text-xs text-red-600">Passwords don't match</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit Button - Full Width */}
              <div className="mt-6 sm:mt-8">
                <Button
                  type="submit"
                  className="w-full h-10 sm:h-11 bg-blue-600 hover:bg-blue-700 text-sm sm:text-base"
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

              {/* Terms and Conditions */}
              <p className="text-xs text-gray-500 text-center mt-3 sm:mt-4 px-2">
                By completing this registration, you agree to our{' '}
                <a href="#" className="text-blue-600 hover:underline">Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserOnboardingRegistration;
