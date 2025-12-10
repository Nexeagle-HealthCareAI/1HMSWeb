import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { X, Plus, Check, GraduationCap } from 'lucide-react';

interface QualificationSelectorProps {
  selectedQualifications: string[];
  onQualificationsChange: (qualifications: string[]) => void;
  disabled?: boolean;
}

export const QualificationSelector: React.FC<QualificationSelectorProps> = ({
  selectedQualifications,
  onQualificationsChange,
  disabled = false
}) => {
  const { t } = useTranslation();
  const [customQualification, setCustomQualification] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Common medical qualifications for quick selection
  const commonQualifications = [
    'MBBS',
    'MD',
    'MS',
    'DM',
    'MCh',
    'DNB',
    'FRCS',
    'MRCP',
    'FRCP',
    'FACS',
    'FICS',
    'PhD',
    'MSc',
    'BDS',
    'MDS',
    'BAMS',
    'BHMS',
    'BUMS'
  ];

  const handleAddQualification = (qualification: string) => {
    if (qualification.trim() && !selectedQualifications.includes(qualification.trim())) {
      onQualificationsChange([...selectedQualifications, qualification.trim()]);
    }
  };

  const handleRemoveQualification = (qualification: string) => {
    onQualificationsChange(selectedQualifications.filter(q => q !== qualification));
  };

  const handleAddCustomQualification = () => {
    if (customQualification.trim()) {
      handleAddQualification(customQualification);
      setCustomQualification('');
      setShowCustomInput(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCustomQualification();
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="qualifications">{t('qualificationSelector.label')}</Label>
        <p className="text-sm text-muted-foreground mb-2">
          {t('qualificationSelector.description')}
        </p>
      </div>

      {/* Selected Qualifications */}
      {selectedQualifications.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t('qualificationSelector.selected')}</Label>
          <div className="flex flex-wrap gap-2">
            {selectedQualifications.map((qual, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="flex items-center gap-1 px-3 py-1"
              >
                <GraduationCap className="h-3 w-3 text-blue-600" />
                {qual}
                {!disabled && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-red-100 hover:text-red-600"
                    onClick={() => handleRemoveQualification(qual)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Common Qualifications */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">{t('qualificationSelector.common')}</Label>
        <Card className="max-h-48 overflow-y-auto">
          <CardContent className="p-2">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
              {commonQualifications.map((qual) => (
                <Button
                  key={qual}
                  variant="ghost"
                  className="w-full justify-start text-left h-auto p-2 hover:bg-accent text-sm"
                  onClick={() => handleAddQualification(qual)}
                  disabled={disabled || selectedQualifications.includes(qual)}
                >
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-3 w-3" />
                    {qual}
                    {selectedQualifications.includes(qual) && (
                      <Check className="h-3 w-3 text-green-600 ml-auto" />
                    )}
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Custom Qualification Input */}
      {!disabled && (
        <div className="space-y-2">
          {!showCustomInput ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCustomInput(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              {t('qualificationSelector.custom.button')}
            </Button>
          ) : (
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('qualificationSelector.custom.label')}</Label>
              <div className="flex gap-2">
                <Input
                  placeholder={t('qualificationSelector.custom.placeholder')}
                  value={customQualification}
                  onChange={(e) => setCustomQualification(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  onClick={handleAddCustomQualification}
                  disabled={!customQualification.trim()}
                >
                  {t('qualificationSelector.custom.add')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowCustomInput(false);
                    setCustomQualification('');
                  }}
                >
                  {t('qualificationSelector.custom.cancel')}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Help Text */}
      <div className="text-xs text-muted-foreground">
        💡 {t('qualificationSelector.help')}
      </div>
    </div>
  );
};
