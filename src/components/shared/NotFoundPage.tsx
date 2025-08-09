import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft, LogIn, Search, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

const NotFoundPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const handleGoToLogin = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-2xl mx-auto text-center space-y-8 p-8">
        {/* 404 Icon with Animation */}
        <div className="relative">
          <div className="text-9xl font-bold text-blue-100 animate-pulse">404</div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-6xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              404
            </div>
          </div>
          <div className="absolute -top-4 -right-4">
            <AlertTriangle className="h-12 w-12 text-orange-500 animate-bounce" />
          </div>
        </div>

        {/* Error Message */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-gray-900">
            Oops! Page Not Found
          </h1>
          <p className="text-lg text-gray-600 max-w-md mx-auto leading-relaxed">
            The page you're looking for doesn't exist or you might not have access to it. 
            Let's get you back on track!
          </p>
        </div>

        {/* Search Icon */}
        <div className="flex justify-center">
          <div className="p-4 bg-blue-100 rounded-full">
            <Search className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {!isAuthenticated ? (
            <Button 
              onClick={handleGoToLogin}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <LogIn className="mr-2 h-5 w-5" />
              Go to Login
            </Button>
          ) : (
            <Button asChild className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
              <Link to="/dashboard">
                <Home className="mr-2 h-5 w-5" />
                Go to Dashboard
              </Link>
            </Button>
          )}
          
          <Button 
            variant="outline" 
            onClick={() => window.history.back()}
            className="border-2 border-gray-300 text-gray-700 font-semibold px-8 py-3 rounded-xl hover:bg-gray-50 transition-all duration-300"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Go Back
          </Button>
        </div>

        {/* Additional Help */}
        <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Need Help?
          </h3>
          <p className="text-sm text-blue-700 mb-4">
            If you believe this is an error or need assistance, please contact our support team.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center text-sm">
            
          </div>
        </div>

        {/* Quick Links */}
        <div className="flex flex-wrap justify-center gap-4 text-sm">
          <Link to="/" className="text-blue-600 hover:text-blue-800 hover:underline transition-colors">
            Home
          </Link>
          <span className="text-gray-400">•</span>
          <Link to="/help" className="text-blue-600 hover:text-blue-800 hover:underline transition-colors">
            Help Center
          </Link>
          <span className="text-gray-400">•</span>
          <Link to="/contact" className="text-blue-600 hover:text-blue-800 hover:underline transition-colors">
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
