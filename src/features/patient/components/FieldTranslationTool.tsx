import React, { useState } from 'react';
import { Globe, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { translationApi } from '@/features/prescription/services/translationApi';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';

interface FieldTranslationToolProps {
  text: string;
  onTranslated: (newText: string) => void;
  targetLanguage?: string;
  className?: string;
}

/**
 * Translates a single authoring-form field in place, with an undo path -- unlike the
 * print-preview "Translate: English/Hindi/Bengali" buttons (which only affect an ephemeral
 * rendered PDF), this OVERWRITES the live form field the caller passed in via onTranslated.
 * If the doctor then saves, that becomes the permanent stored clinical record for the field.
 *
 * `originalText`/`translatedText` track exactly one translation round-trip: right after a
 * successful translate, `text === translatedText` (the field still holds what we just wrote),
 * so the button switches to "undo" and clicking it restores `originalText`. The moment the
 * doctor types anything else into the field, `text` no longer equals `translatedText`, so the
 * next render falls back to the normal "translate" affordance and the stale undo state is
 * dropped -- restoring `originalText` at that point would silently discard whatever the
 * doctor just typed, which is worse than simply not offering undo anymore.
 */
export const FieldTranslationTool: React.FC<FieldTranslationToolProps> = ({
  text,
  onTranslated,
  targetLanguage = 'Hindi',
  className = ''
}) => {
  const [isTranslating, setIsTranslating] = useState(false);
  const [originalText, setOriginalText] = useState<string | null>(null);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const { toast } = useToast();

  const canUndo = originalText !== null && translatedText !== null && text === translatedText;

  const handleClick = async () => {
    if (canUndo) {
      onTranslated(originalText);
      setOriginalText(null);
      setTranslatedText(null);
      return;
    }

    if (!text || text.trim() === '') return;
    setIsTranslating(true);
    try {
      const response = await translationApi.translateText({ text, targetLanguage });
      if (response.translatedText) {
        setOriginalText(text);
        setTranslatedText(response.translatedText);
        onTranslated(response.translatedText);
      }
    } catch (error) {
      console.error('Translation failed:', error);
      toast({
        title: 'Translation failed',
        description: `Could not translate this field to ${targetLanguage}. The original text is unchanged.`,
        variant: 'destructive',
      });
    } finally {
      setIsTranslating(false);
    }
  };

  const tooltipText = canUndo ? 'Undo translation (restore original text)' : `Translate to ${targetLanguage}`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClick}
            disabled={isTranslating || (!canUndo && !text.trim())}
            className={`h-6 w-6 rounded-full hover:bg-brand-100 hover:text-brand-600 text-gray-400 ${className}`}
          >
            {isTranslating ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : canUndo ? (
              <RotateCcw className="h-3 w-3" />
            ) : (
              <Globe className="h-3 w-3" />
            )}
            <span className="sr-only">{tooltipText}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
