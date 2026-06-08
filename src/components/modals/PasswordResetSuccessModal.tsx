import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface PasswordResetSuccessModalProps {
  onLogin: () => void;
  onResetAnother: () => void;
}

export const PasswordResetSuccessModal: React.FC<PasswordResetSuccessModalProps> = ({
  onLogin,
  onResetAnother
}) => {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
        {/* Success Icon */}
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6" aria-hidden="true">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        {/* Success Message */}
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {t('passwordResetSuccess.title')}
        </h2>
        
        <p className="text-gray-600 mb-8 leading-relaxed">
          {t('passwordResetSuccess.description')}
        </p>
        
        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={onLogin}
            className="w-full h-12 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold text-base rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
          >
            {t('passwordResetSuccess.actions.loginNow')}
          </Button>
          
          <Button
            onClick={onResetAnother}
            variant="outline"
            className="w-full h-12 border-2 border-gray-300 text-gray-700 font-semibold text-base rounded-xl hover:bg-gray-50 transition-all duration-300"
          >
            {t('passwordResetSuccess.actions.resetAnother')}
          </Button>
        </div>
        
        {/* Additional Login Option */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-3">
            {t('passwordResetSuccess.actions.continueReset')}
          </p>
          <Button
            onClick={onLogin}
            variant="ghost"
            className="w-full text-brand-600 hover:text-brand-700 hover:bg-brand-50 font-medium"
          >
            {t('passwordResetSuccess.actions.goToLogin')}
          </Button>
        </div>
      </div>
    </div>
  );
};
