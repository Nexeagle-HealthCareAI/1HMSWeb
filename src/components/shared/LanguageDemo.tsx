import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LanguageSelector } from './LanguageSelector';
import { useLanguage } from '@/hooks/useLanguage';
import { useTranslation } from 'react-i18next';
import { Globe, Settings, Monitor, CheckCircle } from 'lucide-react';

export const LanguageDemo: React.FC = () => {
  const { t } = useTranslation();
  const { currentLanguage, isRTL } = useLanguage();

  return (
    <div className="space-y-6">
      {/* Current Language Status */}
      <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-900 dark:text-green-100">
            <CheckCircle className="h-5 w-5" />
            Current Language Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-800">
              <Globe className="h-5 w-5 text-green-600" />
              <div>
                <div className="font-medium text-green-900 dark:text-green-100">Current Language</div>
                <div className="text-sm text-green-700 dark:text-green-300">{currentLanguage.toUpperCase()}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-800">
              <Monitor className="h-5 w-5 text-green-600" />
              <div>
                <div className="font-medium text-green-900 dark:text-green-100">Layout Direction</div>
                <div className="text-sm text-green-700 dark:text-green-300">{isRTL() ? 'RTL (Right-to-Left)' : 'LTR (Left-to-Right)'}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-800">
              <Settings className="h-5 w-5 text-green-600" />
              <div>
                <div className="font-medium text-green-900 dark:text-green-100">Status</div>
                <div className="text-sm text-green-700 dark:text-green-300">Active</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Language Selector Variants */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Language Selector Variants
          </CardTitle>
          <CardDescription>
            Different ways to change your language preference
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enhanced Variant */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="default">Recommended</Badge>
              <h4 className="font-medium">Enhanced Selector (Settings Page)</h4>
            </div>
            <LanguageSelector 
              variant="enhanced" 
              showFlags={true} 
              showNativeNames={true}
              showDescriptions={true}
              label="Application Language"
            />
            <p className="text-sm text-muted-foreground">
              Best for detailed language selection with descriptions and region information.
            </p>
          </div>

          <div className="border-t pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Select Variant */}
              <div className="space-y-3">
                <h4 className="font-medium">Dropdown Select</h4>
                <LanguageSelector 
                  variant="select" 
                  showFlags={true} 
                  showNativeNames={true}
                  showDescriptions={true}
                />
                <p className="text-sm text-muted-foreground">
                  Compact dropdown with language options and descriptions.
                </p>
              </div>

              {/* Popover Variant */}
              <div className="space-y-3">
                <h4 className="font-medium">Popover Selector (Header)</h4>
                <LanguageSelector 
                  variant="popover" 
                  showFlags={true} 
                  showNativeNames={true}
                  showDescriptions={true}
                />
                <p className="text-sm text-muted-foreground">
                  Quick access popover used in the application header.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Translation Examples */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Translation Examples
          </CardTitle>
          <CardDescription>
            See how the interface text changes with different languages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium">Common Interface Elements</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Loading:</span>
                  <span>{t('common.loading')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Error:</span>
                  <span>{t('common.error')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Success:</span>
                  <span>{t('common.success')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Language:</span>
                  <span>{t('common.language')}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Authentication</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sign In:</span>
                  <span>{t('auth.signIn')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span>{t('auth.email')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Password:</span>
                  <span>{t('auth.password')}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
