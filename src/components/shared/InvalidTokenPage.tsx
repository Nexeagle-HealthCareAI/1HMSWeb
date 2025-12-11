import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Mail,
  ArrowLeft,
  Shield,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface InvalidTokenPageProps {
  message?: string;
}

const InvalidTokenPage: React.FC<InvalidTokenPageProps> = ({ message }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const resolvedMessage = message ?? t('invalidToken.defaultMessage');
  const reasons = useMemo(
    () => t('invalidToken.reasons', { returnObjects: true }) as string[],
    [t]
  );

  const handleBackToLogin = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 py-4 sm:py-8 px-3 sm:px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-center mb-3 sm:mb-4">
            <img 
              src="/Logo.png" 
              alt={t('invalidToken.brandAlt')}
              className="h-10 w-auto sm:h-12 mr-2 sm:mr-3"
            />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('invalidToken.brandName')}</h1>
          </div>
        </div>

        {/* Invalid Token Card */}
        <Card className="shadow-lg border-0 border-t-4 border-t-red-500">
          <CardHeader className="pb-4 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-xl font-semibold text-gray-800">
              {t('invalidToken.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 text-center space-y-6">
            {/* Error Message */}
            <div className="space-y-3">
              <p className="text-gray-600 text-base">
                {resolvedMessage}
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left">
                <h4 className="font-medium text-red-800 mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {t('invalidToken.reasonsTitle')}
                </h4>
                <ul className="text-sm text-red-700 space-y-1 ml-6">
                  {reasons.map((reason) => (
                    <li key={reason}>• {reason}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-3 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {t('invalidToken.helpTitle')}
              </h4>
              <div className="text-sm text-blue-700 space-y-2 text-left">
                <p>
                  <strong>{t('invalidToken.contactAdmin')}</strong> {t('invalidToken.requestNewLink')}
                </p>
                <p>{t('invalidToken.provideInfo')}</p>
                <ul className="ml-4 space-y-1">
                  <li>• {t('invalidToken.info.fullName')}</li>
                  <li>• {t('invalidToken.info.mobileNumber')}</li>
                  <li>• {t('invalidToken.info.intendedRole')}</li>
                  <li>• {t('invalidToken.info.receivedWhen')}</li>
                </ul>
              </div>
            </div>

            {/* Security Notice */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                {t('invalidToken.securityTitle')}
              </h4>
              <p className="text-sm text-gray-600 text-left">
                {t('invalidToken.securityMessage')}
              </p>
            </div>

            {/* Actions */}
            <div className="pt-4 space-y-3">
              <Button
                onClick={handleBackToLogin}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('invalidToken.backToLogin')}
              </Button>
              
              <p className="text-xs text-gray-500">
                {t('invalidToken.errorNote')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InvalidTokenPage;
