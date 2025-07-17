import React, { useState } from 'react';
import { Eye, EyeOff, Shield, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';

interface LoginProps {
  onLogin: () => void;
  onSwitchToRegister: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin, onSwitchToRegister }) => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId || !password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Welcome back!",
        description: "Successfully logged in to NexEagle easyHMS"
      });
      onLogin();
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex">
      {/* Left side - Login Form (1/3) */}
      <div className="w-full lg:w-1/3 flex items-center justify-center p-8">
        <Card className="w-full max-w-md shadow-elegant">
          <CardHeader className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-gradient-primary rounded-full">
                <Stethoscope className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-healthcare-primary">
              NexEagle easyHMS
            </CardTitle>
            <p className="text-muted-foreground">
              Healthcare Management System
            </p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="userId">User ID</Label>
                <Input
                  id="userId"
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="Enter your user ID"
                  className="h-11"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="h-11 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 bg-gradient-primary text-white font-semibold"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Login"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                New to NexEagle?{' '}
                <Button
                  variant="link"
                  className="p-0 h-auto font-semibold text-healthcare-primary"
                  onClick={onSwitchToRegister}
                >
                  Register now
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right side - Promotional Banner (2/3) */}
      <div className="hidden lg:flex w-2/3 bg-gradient-primary items-center justify-center p-12">
        <div className="text-white max-w-2xl">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="h-12 w-12" />
            <h1 className="text-4xl font-bold">Healthcare Excellence</h1>
          </div>
          
          <h2 className="text-2xl font-semibold mb-4">
            Modern Healthcare Management
          </h2>
          
          <p className="text-xl opacity-90 mb-8">
            Streamline your healthcare operations with our intuitive admin system. 
            Manage appointments, patients, and staff efficiently.
          </p>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <h3 className="font-semibold">Quick Registration</h3>
              <p className="opacity-80">OTP-based lightning fast onboarding</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Smart Scheduling</h3>
              <p className="opacity-80">Advanced appointment management</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Patient Management</h3>
              <p className="opacity-80">Comprehensive patient profiles</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Mobile Responsive</h3>
              <p className="opacity-80">Works perfectly on all devices</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};