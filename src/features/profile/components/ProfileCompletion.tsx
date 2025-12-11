import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X, Upload, Building, Mail, Camera, Star, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';

interface ProfileCompletionProps {
  onClose: () => void;
}

interface ProfileFieldMeta {
  id: 'mobile' | 'license' | 'hospital' | 'email' | 'photo';
  icon: React.ComponentType<any>;
  required: boolean;
  defaultCompleted?: boolean;
  hasEnforcement?: boolean;
  hasBenefit?: boolean;
  actionKey?: string;
}

const profileFieldMeta: ProfileFieldMeta[] = [
  { id: 'mobile', icon: Check, required: true, defaultCompleted: true },
  { id: 'license', icon: Upload, required: true, hasEnforcement: true, hasBenefit: true, actionKey: 'license' },
  { id: 'hospital', icon: Building, required: true, hasEnforcement: true, hasBenefit: true, actionKey: 'hospital' },
  { id: 'email', icon: Mail, required: false, hasBenefit: true, actionKey: 'email' },
  { id: 'photo', icon: Camera, required: false, hasBenefit: true, actionKey: 'photo' },
];

const initialCompletionState = profileFieldMeta.reduce<Record<string, boolean>>((acc, meta) => {
  acc[meta.id] = meta.defaultCompleted ?? false;
  return acc;
}, {});

export const ProfileCompletion: React.FC<ProfileCompletionProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);
  const [completedState, setCompletedState] = useState<Record<string, boolean>>(initialCompletionState);

  const profileFields = useMemo(() => profileFieldMeta.map((meta) => ({
    ...meta,
    label: t(`profileCompletion.fields.${meta.id}.label`),
    description: t(`profileCompletion.fields.${meta.id}.description`),
    enforcement: meta.hasEnforcement ? t(`profileCompletion.fields.${meta.id}.enforcement`) : undefined,
    benefit: meta.hasBenefit ? t(`profileCompletion.fields.${meta.id}.benefit`) : undefined,
    actionLabel: t(`profileCompletion.fields.${meta.id}.action`, { defaultValue: t('profileCompletion.fields.defaultAction') }),
    completed: completedState[meta.id] ?? false,
  })), [t, completedState]);

  const completedCount = profileFields.filter((field) => field.completed).length;
  const totalFields = profileFields.length;
  const progressPercentage = Math.round((completedCount / totalFields) * 100);

  const handleCompleteField = (fieldId: string) => {
    setCompletedState((prev) => ({ ...prev, [fieldId]: true }));
    
    toast({
      title: t('profileCompletion.toast.updatedTitle'),
      description: t('profileCompletion.toast.updatedDescription')
    });
  };

  const remindLater = () => {
    toast({
      title: t('profileCompletion.toast.reminderTitle'),
      description: t('profileCompletion.toast.reminderDescription', { count: 3 })
    });
    onClose();
  };

  return (
    <>
      <Card className="bg-gradient-primary text-white shadow-elegant mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-full">
                <Star className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{t('profileCompletion.card.title')}</h3>
                <p className="text-white/90 text-sm">
                  {t('profileCompletion.card.subtitle')}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">{t('profileCompletion.card.progressLabel', { percent: progressPercentage })}</span>
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                {t('profileCompletion.card.progressBadge', { completed: completedCount, total: totalFields })}
              </Badge>
            </div>
            
            <Progress value={progressPercentage} className="h-2 bg-white/20" />
            
            <div className="flex gap-3 pt-2">
              <Button 
                onClick={() => setShowModal(true)}
                className="bg-white text-healthcare-primary hover:bg-white/90 font-semibold"
              >
                {t('profileCompletion.card.ctaPrimary', { minutes: 2 })}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                onClick={remindLater}
                className="text-white border-white/30 hover:bg-white/20"
              >
                {t('profileCompletion.card.ctaSecondary')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Completion Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-healthcare-primary">
              {t('profileCompletion.modal.title')}
            </DialogTitle>
            <DialogDescription>
              {t('profileCompletion.modal.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="font-medium">{t('profileCompletion.modal.currentProgress')}</span>
              <div className="flex items-center gap-2">
                <Progress value={progressPercentage} className="w-20 h-2" />
                <span className="text-sm font-semibold">{progressPercentage}%</span>
              </div>
            </div>

            <div className="space-y-3">
              {profileFields.map((field) => (
                <div key={field.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      field.completed 
                        ? 'bg-healthcare-success/20 text-healthcare-success' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      <field.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{field.label}</span>
                        {field.required && (
                          <Badge variant="outline" className="text-xs">{t('profileCompletion.badges.required')}</Badge>
                        )}
                        {field.completed && (
                          <Badge variant="default" className="text-xs bg-healthcare-success">
                            {t('profileCompletion.badges.completed')}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{field.description}</p>
                      {field.enforcement && (
                        <p className="text-xs text-healthcare-warning mt-1">
                          ⚠️ {field.enforcement}
                        </p>
                      )}
                      {field.benefit && (
                        <p className="text-xs text-healthcare-success mt-1">
                          ✨ {field.benefit}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {!field.completed && (
                    <Button 
                      size="sm"
                      onClick={() => handleCompleteField(field.id)}
                      className="bg-healthcare-primary hover:bg-healthcare-primary/90"
                    >
                      {field.actionLabel}
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {progressPercentage >= 90 && (
              <div className="p-4 bg-gradient-primary/10 rounded-lg border border-healthcare-primary/20">
                <div className="flex items-center gap-2 text-healthcare-primary mb-2">
                  <Star className="h-5 w-5" />
                  <span className="font-semibold">{t('profileCompletion.congrats.title')}</span>
                </div>
                <p className="text-sm">
                  {t('profileCompletion.congrats.message')}
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button 
                onClick={() => setShowModal(false)}
                className="flex-1 bg-healthcare-primary"
              >
                {t('profileCompletion.modal.saveProgress')}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowModal(false);
                  remindLater();
                }}
              >
                {t('profileCompletion.modal.later')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};



