import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Globe, Check, Languages, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag?: string;
  description: string;
  region: string;
}

const languages: Language[] = [
  { 
    code: 'en', 
    name: 'English', 
    nativeName: 'English', 
    flag: '🇺🇸',
    description: 'International English',
    region: 'Global'
  },
  { 
    code: 'hi', 
    name: 'Hindi', 
    nativeName: 'हिंदी', 
    flag: '🇮🇳',
    description: 'Hindi (India)',
    region: 'India'
  },
];

interface LanguageSelectorProps {
  variant?: 'select' | 'popover' | 'dropdown' | 'enhanced';
  className?: string;
  showFlags?: boolean;
  showNativeNames?: boolean;
  showDescriptions?: boolean;
  label?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'popover',
  className,
  showFlags = true,
  showNativeNames = true,
  showDescriptions = false,
  label = 'Language'
}) => {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
    setIsOpen(false);
    
    // Update document language
    document.documentElement.dir = 'ltr';
    document.documentElement.lang = languageCode;
  };

  const renderLanguageOption = (language: Language, showFullInfo = false) => (
    <div className="flex items-center gap-3">
      {showFlags && <span className="text-lg flex-shrink-0">{language.flag}</span>}
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{language.name}</span>
          {showNativeNames && language.nativeName !== language.name && (
            <span className="text-xs text-muted-foreground font-normal">({language.nativeName})</span>
          )}
        </div>
        {showFullInfo && showDescriptions && (
          <div className="text-xs text-muted-foreground mt-0.5">
            <span>{language.description}</span>
            <span className="mx-1">•</span>
            <span>{language.region}</span>
          </div>
        )}
      </div>
    </div>
  );

  const renderEnhancedLanguageOption = (language: Language) => (
    <div className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
      <span className="text-2xl flex-shrink-0">{language.flag}</span>
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{language.name}</span>
          {language.nativeName !== language.name && (
            <span className="text-xs text-muted-foreground font-normal">({language.nativeName})</span>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          <span>{language.description}</span>
          <span className="mx-1">•</span>
          <span>{language.region}</span>
        </div>
      </div>
      {i18n.language === language.code && (
        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
      )}
    </div>
  );

  if (variant === 'enhanced') {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex items-center gap-2">
          <Languages className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between p-4 h-auto"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{currentLanguage.flag}</span>
                <div className="flex flex-col items-start">
                  <span className="font-medium">{currentLanguage.name}</span>
                  <span className="text-xs text-muted-foreground">{currentLanguage.description}</span>
                </div>
              </div>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-sm">Select Language</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Choose your preferred language for the application interface
              </p>
            </div>
            <div className="py-2">
              {languages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => handleLanguageChange(language.code)}
                  className={cn(
                    "w-full px-3",
                    i18n.language === language.code && "bg-blue-50 dark:bg-blue-900/20"
                  )}
                >
                  {renderEnhancedLanguageOption(language)}
                </button>
              ))}
            </div>
            <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Monitor className="h-3 w-3" />
                <span>Language changes apply immediately</span>
              </div>
              {i18n.language === 'hi' && (
                <div className="flex items-center gap-2 text-xs text-blue-600 mt-1">
                  <span>🇮🇳</span>
                  <span>Hindi language active</span>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  if (variant === 'select') {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Globe className="h-4 w-4 text-muted-foreground" />
        <Select value={i18n.language} onValueChange={handleLanguageChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue>
              <div className="flex items-center gap-2">
                {showFlags && <span>{currentLanguage.flag}</span>}
                <span>{currentLanguage.name}</span>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {languages.map((language) => (
              <SelectItem key={language.code} value={language.code}>
                {renderLanguageOption(language, true)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (variant === 'dropdown') {
    return (
      <div className={cn("relative", className)}>
        <Button
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2"
        >
          <Globe className="h-4 w-4" />
          {showFlags && <span>{currentLanguage.flag}</span>}
          <span>{currentLanguage.name}</span>
        </Button>
        
        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50">
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-xs font-medium text-muted-foreground">Select Language</span>
            </div>
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => handleLanguageChange(language.code)}
                className={cn(
                  "w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between",
                  i18n.language === language.code && "bg-blue-50 dark:bg-blue-900/20"
                )}
              >
                {renderLanguageOption(language, true)}
                {i18n.language === language.code && (
                  <Check className="h-4 w-4 text-blue-600" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Default popover variant
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("flex items-center gap-2", className)}
        >
          <Globe className="h-4 w-4" />
          {showFlags && <span>{currentLanguage.flag}</span>}
          <span>{currentLanguage.name}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="end">
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <span className="text-sm font-medium">Choose Language</span>
        </div>
        <div className="py-1">
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              className={cn(
                "w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between",
                i18n.language === language.code && "bg-blue-50 dark:bg-blue-900/20"
              )}
            >
              {renderLanguageOption(language, true)}
              {i18n.language === language.code && (
                <Check className="h-4 w-4 text-blue-600" />
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
