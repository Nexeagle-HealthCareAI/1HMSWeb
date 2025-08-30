import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Globe, Check, Languages, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/hooks/useLanguage';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
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
    name: 'हिंदी', 
    nativeName: 'हिंदी', 
    flag: '🇮🇳',
    description: 'हिंदी (भारत)',
    region: 'भारत'
  },
];

export const HeaderLanguageSelector: React.FC = () => {
  const { i18n, t } = useTranslation();
  const { isRTL } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
    setIsOpen(false);
    
    // Update document direction for RTL languages
    if (languageCode === 'ar') {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = 'ar';
    } else {
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = languageCode;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative p-2 hover:bg-muted/50 rounded-lg transition-all duration-200 group"
                     title={t('header.changeLanguage')}
        >
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            <span className="text-lg">{currentLanguage.flag}</span>
            <span className="hidden lg:inline text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              {currentLanguage.code.toUpperCase()}
            </span>
          </div>
          
          {/* RTL Indicator */}
          {isRTL() && (
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full border border-white dark:border-gray-900" />
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-72 p-0" align="end">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
                         <Languages className="h-4 w-4 text-blue-600" />
             <h3 className="font-semibold text-sm">{t('languageSelector.selectLanguage')}</h3>
           </div>
           <p className="text-xs text-muted-foreground mt-1">
             {t('languageSelector.chooseLanguage')}
           </p>
        </div>
        
        <div className="py-2">
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              className={cn(
                "w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
                i18n.language === language.code && "bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-500"
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl flex-shrink-0">{language.flag}</span>
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{language.name}</span>
                    {language.nativeName !== language.name && (
                      <span className="text-xs text-muted-foreground font-normal">({language.nativeName})</span>
                    )}
                                         {i18n.language === language.code && (
                       <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                         {t('languageSelector.current')}
                       </Badge>
                     )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {language.description} • {language.region}
                  </div>
                </div>
                {i18n.language === language.code && (
                  <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />
                )}
              </div>
            </button>
          ))}
        </div>
        
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                     <div className="flex items-center gap-2 text-xs text-muted-foreground">
             <Monitor className="h-3 w-3" />
             <span>{t('languageSelector.changesApplyImmediately')}</span>
           </div>
           {isRTL() && (
             <div className="flex items-center gap-2 text-xs text-blue-600 mt-1">
               <span>🔄</span>
               <span>{t('languageSelector.rtlLayoutActive')}</span>
             </div>
           )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
