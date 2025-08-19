import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface LockedAccountScreenProps {
  lockoutTimeRemaining: number;
  isLocked: boolean;
}

export const LockedAccountScreen: React.FC<LockedAccountScreenProps> = ({
  lockoutTimeRemaining,
  isLocked
}) => {
  return (
    <div className="h-screen bg-gradient-subtle flex flex-col lg:flex-row overflow-hidden">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white shadow-sm border-b px-4 py-2 flex-shrink-0">
        <div className="flex items-center justify-center gap-2">
          <img 
            src="/Images/77834bc6-d9bc-41d2-8676-026af7cf79bc.png" 
            alt="Company Logo" 
            className="h-6 w-6"
            style={{ width: '24px', height: '24px' }}
          />
          <span className="font-bold text-base">NexEagle HMS</span>
        </div>
      </div>

      {/* Desktop Promotional Banner (2/3) */}
      <div className="hidden lg:flex w-2/3 bg-gradient-primary items-center justify-center p-8">
        <div className="text-white max-w-2xl">
          <div className="flex items-center gap-3 mb-6">
            <img 
              src="/Images/77834bc6-d9bc-41d2-8676-026af7cf79bc.png" 
              alt="Company Logo" 
              className="h-12 w-12" 
              style={{ width: '48px', height: '48px' }} 
            />
            <h1 className="text-3xl font-bold">Account Security</h1>
          </div>
          
          <h2 className="text-xl font-semibold mb-4">
            Protecting Your Healthcare Practice
          </h2>
          
          <p className="text-lg opacity-90 mb-6 leading-relaxed">
            Your account has been temporarily locked for security reasons. 
            This helps protect your sensitive healthcare data.
          </p>
        </div>
      </div>

      {/* Locked Account Form */}
      <div className="w-full lg:w-1/3 flex items-center justify-center p-4 lg:p-6 flex-1">
        <Card className="w-full max-w-md shadow-elegant">
          <CardHeader className="text-center space-y-3 pb-4">
            <div className="hidden lg:flex justify-center mb-3">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-xl lg:text-2xl font-bold text-red-600">
              Account Temporarily Locked
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Too many failed login attempts. Please try again in:
            </p>
            <div className="text-2xl font-bold text-red-600">
              {Math.floor(lockoutTimeRemaining / 60)}:{(lockoutTimeRemaining % 60).toString().padStart(2, '0')}
            </div>
          </CardHeader>
          <CardContent className="text-center">
            <Button
              onClick={() => window.location.reload()}
              className="w-full h-12 bg-gradient-primary text-white font-semibold text-base rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
              disabled={isLocked}
            >
              {isLocked ? 'Please Wait...' : 'Try Again'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}; 