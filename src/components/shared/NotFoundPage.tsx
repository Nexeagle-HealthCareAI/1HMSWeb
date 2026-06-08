import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft, LogIn, Search, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

const NotFoundPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { t } = useTranslation();

  const handleGoToLogin = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-brand-50">
      <div className="max-w-2xl mx-auto text-center space-y-8 p-8">
        {/* 404 Icon with Animation */}
        <div className="relative">
          <div className="text-9xl font-bold text-brand-100 animate-pulse" aria-hidden="true">{t('notFound.code')}</div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-6xl font-bold bg-gradient-to-r from-brand-600 to-brand-600 bg-clip-text text-transparent">
              {t('notFound.code')}
            </div>
          </div>
          <div className="absolute -top-4 -right-4">
            <AlertTriangle className="h-12 w-12 text-orange-500 animate-bounce" />
          </div>
        </div>

        {/* Error Message */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-gray-900">
            {t('notFound.title')}
          </h1>
          <p className="text-lg text-gray-600 max-w-md mx-auto leading-relaxed">
            {t('notFound.description')}
          </p>
        </div>

        {/* Search Icon */}
        <div className="flex justify-center">
          <div className="p-4 bg-brand-100 rounded-full" aria-hidden="true">
            <Search className="h-8 w-8 text-brand-600" />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {!isAuthenticated ? (
            <Button 
              onClick={handleGoToLogin}
              className="bg-gradient-to-r from-brand-600 to-brand-600 hover:from-brand-700 hover:to-brand-700 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <LogIn className="mr-2 h-5 w-5" />
              {t('notFound.goToLogin')}
            </Button>
          ) : (
            <Link to="/dashboard">
              <Button className="bg-healthcare-primary hover:bg-healthcare-primary/90 text-white">
                {t('notFound.goToDashboard')}
              </Button>
            </Link>
          )}
          
          <Button 
            variant="outline" 
            onClick={() => window.history.back()}
            className="border-2 border-gray-300 text-gray-700 font-semibold px-8 py-3 rounded-xl hover:bg-gray-50 transition-all duration-300"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            {t('notFound.goBack')}
          </Button>
        </div>

        {/* Additional Help */}
        <div className="bg-brand-50 rounded-2xl p-6 border border-brand-200">
          <h3 className="text-lg font-semibold text-brand-900 mb-2">
            {t('notFound.helpTitle')}
          </h3>
          <p className="text-sm text-brand-700 mb-4">
            {t('notFound.helpText')}
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center text-sm">
            
          </div>
        </div>

        {/* Quick Links */}
        <div className="flex flex-wrap justify-center gap-4 text-sm">
          <Link to="/" className="text-brand-600 hover:text-brand-800 hover:underline transition-colors">
            {t('notFound.links.home')}
          </Link>
          <span className="text-gray-400">•</span>
          <Link to="/help" className="text-brand-600 hover:text-brand-800 hover:underline transition-colors">
            {t('notFound.links.helpCenter')}
          </Link>
          <span className="text-gray-400">•</span>
          <Link to="/contact" className="text-brand-600 hover:text-brand-800 hover:underline transition-colors">
            {t('notFound.links.contactUs')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
