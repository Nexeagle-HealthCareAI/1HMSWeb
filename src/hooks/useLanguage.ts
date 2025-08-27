import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';

export const useLanguage = () => {
  const { i18n, t } = useTranslation();

  // Initialize document direction and language on mount
  useEffect(() => {
    const currentLang = i18n.language;
    
    // Set document direction for RTL languages
    if (currentLang === 'ar') {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = 'ar';
    } else {
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = currentLang;
    }
  }, [i18n.language]);

  const changeLanguage = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
    
    // Update document direction for RTL languages
    if (languageCode === 'ar') {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = 'ar';
    } else {
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = languageCode;
    }
  };

  const getCurrentLanguage = () => i18n.language;
  
  const isRTL = () => i18n.language === 'ar';

  return {
    t,
    i18n,
    changeLanguage,
    getCurrentLanguage,
    isRTL,
    currentLanguage: i18n.language,
  };
};
