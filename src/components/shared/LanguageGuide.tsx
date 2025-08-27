import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Globe, Settings, Monitor, Save, Languages } from 'lucide-react';

export const LanguageGuide: React.FC = () => {
  return (
    <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
          <Languages className="h-5 w-5" />
          How to Change Language
        </CardTitle>
        <CardDescription className="text-blue-700 dark:text-blue-300">
          Quick guide to changing your application language
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Method 1: Header */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                <Globe className="h-4 w-4 text-blue-600" />
              </div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100">Method 1: Header</h4>
            </div>
            <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
              <p>1. Look for the globe icon 🌐 in the top header</p>
              <p>2. Click on it to open language options</p>
              <p>3. Select your preferred language</p>
              <Badge variant="outline" className="text-blue-600 border-blue-300">
                Quick Access
              </Badge>
            </div>
          </div>

          {/* Method 2: Settings */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                <Settings className="h-4 w-4 text-blue-600" />
              </div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100">Method 2: Settings</h4>
            </div>
            <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
              <p>1. Go to Settings page</p>
              <p>2. Click on "Theme" tab</p>
              <p>3. Find "Language Settings" section</p>
              <Badge variant="outline" className="text-blue-600 border-blue-300">
                Detailed Options
              </Badge>
            </div>
          </div>
        </div>

        {/* Available Languages */}
        <div className="border-t border-blue-200 dark:border-blue-800 pt-4">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-3">Available Languages</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {[
              { flag: '🇺🇸', name: 'English', code: 'en' },
              { flag: '🇪🇸', name: 'Spanish', code: 'es' },
              { flag: '🇫🇷', name: 'French', code: 'fr' },
              { flag: '🇮🇳', name: 'Hindi', code: 'hi' },
              { flag: '🇸🇦', name: 'Arabic', code: 'ar' },
            ].map((lang) => (
              <div key={lang.code} className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-800">
                <span className="text-lg">{lang.flag}</span>
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">{lang.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="border-t border-blue-200 dark:border-blue-800 pt-4">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-3">Language Features</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
              <Monitor className="h-4 w-4 text-blue-600" />
              <span>Instant application</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
              <Save className="h-4 w-4 text-blue-600" />
              <span>Saved preferences</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
              <Globe className="h-4 w-4 text-blue-600" />
              <span>RTL support (Arabic)</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
