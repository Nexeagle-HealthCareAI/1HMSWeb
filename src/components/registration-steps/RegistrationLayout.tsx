import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface RegistrationLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  promotionalContent?: React.ReactNode;
}

export const RegistrationLayout: React.FC<RegistrationLayoutProps> = ({
  children,
  title,
  subtitle,
  promotionalContent
}) => {
  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex overflow-hidden">
      {/* Left Side - Promotional Content (2/3 width) */}
      <div className="hidden lg:flex lg:w-2/3 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 p-8 items-center justify-center relative">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, white 2px, transparent 2px)`,
            backgroundSize: '50px 50px'
          }}></div>
        </div>
        
        {promotionalContent || (
          <div className="text-white max-w-3xl relative z-10">
            {/* Logo and Brand */}
            <div className="flex items-center gap-3 mb-8">
              <div className="h-12 w-12 bg-white/20 rounded-xl flex items-center justify-center">
                {/* Bird/Medical Cross Logo */}
                <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/>
                  <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z"/>
                </svg>
              </div>
              <h1 className="text-3xl font-bold">Join NexEagle</h1>
            </div>
            
            <h2 className="text-xl font-semibold mb-6 text-center">
              The most advanced Hospital Management System trusted by thousands of healthcare professionals worldwide
            </h2>
            
            {/* Statistics Cards */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
                <div className="text-2xl font-bold mb-1">10K+</div>
                <div className="text-sm opacity-90">Active Doctors</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
                <div className="text-2xl font-bold mb-1">1M+</div>
                <div className="text-sm opacity-90">Patients Served</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
                <div className="text-2xl font-bold mb-1">99.9%</div>
                <div className="text-sm opacity-90">Uptime</div>
              </div>
            </div>
            
            {/* Limited Time Offer */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg p-4 border border-purple-500/30">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-yellow-300">⭐</span>
                <span className="font-semibold">Limited Time Offer</span>
              </div>
              <p className="text-sm opacity-90">
                First 100 doctors get 3 months FREE premium features!
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Right Side - Registration Form (1/3 width) */}
      <div className="flex-1 lg:w-1/3 flex items-center justify-center p-4 lg:p-8">
        <div className="w-full max-w-sm">
          <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm rounded-2xl">
            <CardContent className="p-8">
              {children}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}; 