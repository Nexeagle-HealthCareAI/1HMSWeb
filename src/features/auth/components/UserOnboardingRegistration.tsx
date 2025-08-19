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
  ArrowLeft,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { useAuthApi } from '@/hooks/useApi';
import { ValidationUtils } from '@/utils/validation';
import { InvalidTokenPage } from '@/components/shared';

interface UserOnboardingData {
  fullName: string;
  userRole: string;
  mobileNumber: string;
  email: string;
  password: string;
  confirmPassword: string;
}



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
  
  // Token validation states
  const [isValidatingToken, setIsValidatingToken] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [tokenValidationMessage, setTokenValidationMessage] = useState('');
  
  // Success popup state
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [userId, setUserId] = useState<string>('');
  
  // User already exists popup state
  const [showUserExistsPopup, setShowUserExistsPopup] = useState(false);

  // API hooks
  const sendOTPMutation = useAuthApi.sendOTP();
  const verifyOTPMutation = useAuthApi.verifyOTP();
  const registerMutation = useAuthApi.register(); // Use regular register API first
  const setPasswordMutation = useAuthApi.setPassword(); // Use set-password API
  const validateTokenMutation = useAuthApi.validateToken();

  // Validate token on component mount
  useEffect(() => {
    if (token) {
      validateToken();
    } else {
      // No token provided
      setIsValidatingToken(false);
      setIsTokenValid(false);
      setTokenValidationMessage("No invitation token provided.");
    }
  }, [token]);

  const validateToken = async () => {
    if (!token) {
      setIsValidatingToken(false);
      setIsTokenValid(false);
      setTokenValidationMessage("No invitation token provided.");
      return;
    }

    try {
      setIsValidatingToken(true);
      
      const response = await validateTokenMutation.mutateAsync({
        token: token
      });

      if (response.success) {
        setIsTokenValid(true);
        setIsValidatingToken(false);
        
        // Pre-fill form data if available
        if (response.name) {
          setFormData(prev => ({ ...prev, fullName: response.name || '' }));
        }
        if (response.email) {
          setFormData(prev => ({ ...prev, email: response.email || '' }));
        }
        if (response.mobile) {
          setFormData(prev => ({ ...prev, mobileNumber: response.mobile || '' }));
          // Don't auto-verify mobile - user needs to go through OTP process
        }
        if (response.roleName) {
          setFormData(prev => ({ ...prev, userRole: response.roleName || '' }));
        }
        
        toast({
          title: "Welcome!",
          description: "Your invitation is valid. Please complete your registration.",
        });
      } else {
        setIsTokenValid(false);
        setIsValidatingToken(false);
        setTokenValidationMessage(response.message || "Invalid invitation token.");
      }
    } catch (error: any) {
      console.error('Error validating token:', error);
      setIsTokenValid(false);
      setIsValidatingToken(false);
      setTokenValidationMessage(error.message || "Failed to validate invitation token. Please try again.");
    }
  };

  const handleSendOTP = async () => {
    // Validation
    if (!formData.fullName.trim()) {
      toast({
        title: "Full Name Required",
        description: "Please enter your full name before sending OTP.",
        variant: "destructive"
      });
      return;
    }

    if (!formData.mobileNumber) {
      toast({
        title: "Mobile Number Required",
        description: "Mobile number is required.",
        variant: "destructive"
      });
      return;
    }

    if (!formData.userRole) {
      toast({
        title: "User Role Required",
        description: "User role is required.",
        variant: "destructive"
      });
      return;
    }

    try {
      setOtpLoading(true);
      const cleanMobile = ValidationUtils.cleanMobileNumber(formData.mobileNumber);
      
      // First call register API with fullName and role for onboarding scenario
      const registerResponse = await registerMutation.mutateAsync({
        mobileNumber: cleanMobile,
        roles: formData.userRole // Pass the role from invitation
      });

      if (registerResponse.success) {
        // Then send OTP
        const otpResponse = await sendOTPMutation.mutateAsync({
          mobileNumber: cleanMobile
        });

        if (otpResponse.success) {
          setOtpSent(true);
          toast({
            title: "Registration Initiated",
            description: "User registered successfully. Please check your mobile for the verification code."
          });
        } else {
          throw new Error(otpResponse.message || 'Failed to send OTP');
        }
      } else {
        throw new Error(registerResponse.message || 'Failed to register user');
      }
    } catch (error: any) {
      // Check if the error indicates mobile number already exists
      console.log('Registration error:', error); // Debug log to see the actual error structure
      
      // Check the API response structure for the specific error
      const apiResponse = error.response?.data;
      const apiMessage = apiResponse?.message || '';
      const apiSuccess = apiResponse?.success;
      const httpStatus = error.response?.status;
      
      // Check if this is the specific "Mobile number already exists" error
      const isMobileExistsError = apiMessage.toLowerCase().includes('mobile number already exists') ||
                                 apiMessage.toLowerCase().includes('mobile already exists') ||
                                 apiMessage.toLowerCase().includes('user already exists') ||
                                 apiMessage.toLowerCase().includes('already registered');
      
      // Also check HTTP status codes that typically indicate duplicate/conflict
      const isConflictStatus = httpStatus === 409 || httpStatus === 400;
      
      // Check if the API returned success: false with a user-related error message
      const isApiError = apiSuccess === false && isMobileExistsError;
      
      if (isMobileExistsError || isConflictStatus || isApiError) {
        console.log('Detected user exists error, showing popup'); // Debug log
        // Show user exists popup instead of error toast
        setShowUserExistsPopup(true);
      } else {
        console.log('Showing generic error toast'); // Debug log
        toast({
          title: "Error",
          description: apiMessage || error.message || "Failed to initiate registration. Please try again.",
          variant: "destructive"
        });
      }
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
        // Store userId from OTP verification response
        setUserId(response.userId);
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

    if (!userId) {
      toast({
        title: "User ID Required",
        description: "Please complete mobile verification first.",
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
      
      // Call set-password API with the user data
      const response = await setPasswordMutation.mutateAsync({
        userId: userId, // Use userId from OTP verification
        email: formData.email || formData.mobileNumber, // Use email or mobile as fallback
        password: formData.password
      });

      if (response.success) {
        // Show success popup
        setShowSuccessPopup(true);
      } else {
        throw new Error(response.message || 'Password setup failed');
      }
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to set password. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: keyof UserOnboardingData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Show loading while validating token
  if (isValidatingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
        <div className="text-center space-y-3 sm:space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-base sm:text-lg font-medium text-gray-700">Validating your invitation...</p>
          <p className="text-xs sm:text-sm text-gray-500">Please wait while we verify your invitation link</p>
        </div>
      </div>
    );
  }

  // Show invalid token page if token is not valid
  if (!isTokenValid) {
    return <InvalidTokenPage message={tokenValidationMessage} />;
  }

  // Show loading while submitting form
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
        <div className="text-center space-y-3 sm:space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-base sm:text-lg font-medium text-gray-700">Creating your account...</p>
          <p className="text-xs sm:text-sm text-gray-500">Please wait while we set up your profile</p>
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
                    <Input
                      id="userRole"
                      value={formData.userRole}
                      className="h-10 sm:h-11 text-sm sm:text-base bg-gray-50 text-gray-600 cursor-not-allowed"
                      disabled
                      readOnly
                    />
                    <p className="text-xs text-gray-500">Role assigned by administrator</p>
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
                        className="h-10 sm:h-11 flex-1 text-sm sm:text-base bg-gray-50 text-gray-600 cursor-not-allowed"
                        disabled
                        readOnly
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

                    {!isMobileVerified && formData.mobileNumber && !otpSent && (
                      <p className="text-xs text-blue-600 flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        Click "Send OTP" to register and verify your mobile number
                      </p>
                    )}
                    {isMobileVerified && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Mobile number verified successfully
                      </p>
                    )}
                    <p className="text-xs text-gray-500">Mobile number from invitation</p>
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
                          {otpLoading ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          ) : null}
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

             {/* Success Popup Dialog */}
       <Dialog open={showSuccessPopup} onOpenChange={setShowSuccessPopup}>
         <DialogContent className="sm:max-w-md">
           <DialogHeader>
             <DialogTitle className="flex items-center gap-2">
               <div className="p-2 bg-green-100 rounded-full">
                 <CheckCircle2 className="h-6 w-6 text-green-600" />
               </div>
               Registration Successful!
             </DialogTitle>
             <DialogDescription className="text-left space-y-4">
               <p className="text-base">
                 Congratulations! Your account has been created successfully.
               </p>
               <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                 <h4 className="font-medium text-green-800 mb-2">What's Next?</h4>
                 <ul className="text-sm text-green-700 space-y-1">
                   <li>• Your account is now active in the system</li>
                   <li>• You can log in using your mobile number and password</li>
                   <li>• Contact your administrator if you need any assistance</li>
                 </ul>
               </div>
             </DialogDescription>
           </DialogHeader>
           <DialogFooter className="flex flex-col sm:flex-row gap-2">
             <Button
               onClick={() => navigate('/')}
               className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
             >
               <ArrowLeft className="h-4 w-4 mr-2" />
               Go to Login Page
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>

       {/* User Already Exists Popup Dialog */}
       <Dialog open={showUserExistsPopup} onOpenChange={setShowUserExistsPopup}>
         <DialogContent className="sm:max-w-md">
           <DialogHeader>
             <DialogTitle className="flex items-center gap-2">
               <div className="p-2 bg-orange-100 rounded-full">
                 <AlertCircle className="h-6 w-6 text-orange-600" />
               </div>
               User Already Registered
             </DialogTitle>
             <DialogDescription className="text-left space-y-4">
               <p className="text-base">
                 An account with this mobile number is already registered in our system. You cannot register again with the same mobile number.
               </p>
               <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                 <h4 className="font-medium text-orange-800 mb-2">What should you do?</h4>
                 <ul className="text-sm text-orange-700 space-y-1">
                   <li>• Try logging in with your existing mobile number and password</li>
                   <li>• If you forgot your password, use the "Forgot Password" option on the login page</li>
                   <li>• Contact your administrator if you need help accessing your account</li>
                 </ul>
               </div>
               <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                 <h4 className="font-medium text-blue-800 mb-2">Need Help?</h4>
                 <p className="text-sm text-blue-700">
                   If you believe this is an error or need assistance, please contact your system administrator.
                 </p>
               </div>
             </DialogDescription>
           </DialogHeader>
           <DialogFooter className="flex flex-col sm:flex-row gap-2">
             <Button
               onClick={() => navigate('/')}
               className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
             >
               <ArrowLeft className="h-4 w-4 mr-2" />
               Go to Login Page
             </Button>
             <Button
               variant="outline"
               onClick={() => setShowUserExistsPopup(false)}
               className="w-full sm:w-auto"
             >
               Stay on This Page
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
    </div>
  );
};

export default UserOnboardingRegistration;
