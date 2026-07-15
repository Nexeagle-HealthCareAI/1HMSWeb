import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X, Languages as LanguagesIcon } from 'lucide-react';

interface LanguagesSelectorProps {
  selectedLanguages: string[];
  onLanguagesChange: (languages: string[]) => void;
  disabled?: boolean;
}

const COMMON_LANGUAGES = ['English', 'Hindi', 'Bengali', 'Tamil', 'Telugu', 'Marathi', 'Gujarati', 'Kannada', 'Malayalam', 'Punjabi', 'Urdu'];

export const LanguagesSelector: React.FC<LanguagesSelectorProps> = ({
  selectedLanguages,
  onLanguagesChange,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const [customLanguage, setCustomLanguage] = useState('');

  const addLanguage = (language: string) => {
    const trimmed = language.trim();
    if (trimmed && !selectedLanguages.some((l) => l.toLowerCase() === trimmed.toLowerCase())) {
      onLanguagesChange([...selectedLanguages, trimmed]);
    }
  };

  const removeLanguage = (language: string) => {
    onLanguagesChange(selectedLanguages.filter((l) => l !== language));
  };

  const handleAddCustom = () => {
    if (customLanguage.trim()) {
      addLanguage(customLanguage);
      setCustomLanguage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCustom();
    }
  };

  const remainingCommon = COMMON_LANGUAGES.filter(
    (l) => !selectedLanguages.some((s) => s.toLowerCase() === l.toLowerCase())
  );

  return (
    <div className="space-y-2">
      <Label>{t('languagesSelector.label', { defaultValue: 'Languages spoken' })}</Label>

      {selectedLanguages.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedLanguages.map((language) => (
            <Badge key={language} variant="secondary" className="flex items-center gap-1 px-3 py-1">
              <LanguagesIcon className="h-3 w-3 text-brand-600" />
              {language}
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-red-100 hover:text-red-600"
                  onClick={() => removeLanguage(language)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {!disabled && (
        <>
          {remainingCommon.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {remainingCommon.map((language) => (
                <Button
                  key={language}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => addLanguage(language)}
                >
                  + {language}
                </Button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input
              value={customLanguage}
              onChange={(e) => setCustomLanguage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('languagesSelector.placeholder', { defaultValue: 'Add another language…' })}
              className="flex-1"
            />
            <Button type="button" size="sm" onClick={handleAddCustom} disabled={!customLanguage.trim()}>
              {t('languagesSelector.add', { defaultValue: 'Add' })}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
