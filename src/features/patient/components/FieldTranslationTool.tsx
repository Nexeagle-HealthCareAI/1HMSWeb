import React, { useState } from 'react';
import { Globe, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { translationApi } from '@/features/prescription/services/translationApi';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface FieldTranslationToolProps {
  text: string;
  onTranslated: (newText: string) => void;
  targetLanguage?: string;
  className?: string;
}

export const FieldTranslationTool: React.FC<FieldTranslationToolProps> = ({ 
  text, 
  onTranslated, 
  targetLanguage = 'Hindi',
  className = ''
}) => {
  const [isTranslating, setIsTranslating] = useState(false);

  const handleTranslate = async () => {
    if (!text || text.trim() === '') return;
    setIsTranslating(true);
    try {
      const response = await translationApi.translateText({ text, targetLanguage });
      if (response.translatedText) {
        onTranslated(response.translatedText);
      }
    } catch (error) {
      console.error('Translation failed:', error);
      // Optional: Add toast notification for failure
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleTranslate}
            disabled={isTranslating || !text.trim()}
            className={`h-6 w-6 rounded-full hover:bg-brand-100 hover:text-brand-600 text-gray-400 ${className}`}
          >
            {isTranslating ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Globe className="h-3 w-3" />
            )}
            <span className="sr-only">Translate to {targetLanguage}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">Translate to {targetLanguage}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
