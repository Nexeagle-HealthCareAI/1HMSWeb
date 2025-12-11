import React from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, ArrowRight, X } from 'lucide-react';

interface ProfileCompletionBannerProps {
  profileScore: number;
  onOpenSetup: () => void;
  onDismiss: () => void;
  showDismiss?: boolean;
}

export const ProfileCompletionBanner: React.FC<ProfileCompletionBannerProps> = ({
  profileScore,
  onOpenSetup,
  onDismiss,
  showDismiss = true
}) => {
  const { t } = useTranslation();

  if (profileScore >= 90) return null;

  return (
    <Alert className="mb-6 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="flex items-center justify-between w-full">
        <div className="flex-1 mr-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="font-medium text-amber-800 dark:text-amber-200">
              {t('profileCompletion.banner.message')}
            </span>
            <Badge variant="outline" className="text-amber-700 border-amber-300">
              🚧 {t('profileCompletion.banner.badge', { score: profileScore })}
            </Badge>
          </div>
          <Progress value={profileScore} className="h-2 w-32" />
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            onClick={onOpenSetup} 
            size="sm" 
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {t('profileCompletion.banner.completeSetup')}
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
          
          {showDismiss && (
            <Button 
              onClick={onDismiss} 
              variant="ghost" 
              size="sm"
              className="text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/20"
            >
              <span className="sr-only">{t('profileCompletion.banner.dismiss')}</span>
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};



