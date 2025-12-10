import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { User } from 'lucide-react';
import { TimeSlot } from '../AppointmentBooking';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card } from '../ui/card';

interface EditPatientDialogProps {
  slot: TimeSlot;
  onConfirm: (updatedSlot: TimeSlot) => void;
  onCancel: () => void;
}

export const EditPatientDialog: React.FC<EditPatientDialogProps> = ({
  slot,
  onConfirm,
  onCancel
}) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || 'en';

  const [formData, setFormData] = useState({
    name: slot.patientInfo?.name || '',
    phone: slot.patientInfo?.phone || '',
    age: slot.patientInfo?.age?.toString() || '',
    gender: slot.patientInfo?.gender || ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `+1-${numbers.slice(0, 3)}-${numbers.slice(3, 7)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData(prev => ({ ...prev, phone: formatted }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('editPatientDialog.errors.nameRequired');
    }

    if (!formData.phone.trim()) {
      newErrors.phone = t('editPatientDialog.errors.phoneRequired');
    } else if (formData.phone.replace(/\D/g, '').length < 10) {
      newErrors.phone = t('editPatientDialog.errors.phoneInvalid');
    }

    if (!formData.age.trim()) {
      newErrors.age = t('editPatientDialog.errors.ageRequired');
    } else if (parseInt(formData.age) < 1 || parseInt(formData.age) > 120) {
      newErrors.age = t('editPatientDialog.errors.ageInvalid');
    }

    if (!formData.gender) {
      newErrors.gender = t('editPatientDialog.errors.genderRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      const updatedSlot: TimeSlot = {
        ...slot,
        patientInfo: {
          name: formData.name,
          phone: formData.phone,
          age: parseInt(formData.age),
          gender: formData.gender
        }
      };
      onConfirm(updatedSlot);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-healthcare-primary flex items-center gap-2">
            <User className="h-5 w-5" />
            {t('editPatientDialog.title')}
          </DialogTitle>
        </DialogHeader>

        {/* Current Appointment Info */}
        <Card className="p-4 bg-muted">
          <h3 className="font-semibold text-foreground mb-2">{t('editPatientDialog.appointmentDetails')}</h3>
          <div className="space-y-1 text-sm">
            <p><strong>{t('editPatientDialog.dateLabel')}</strong> {new Intl.DateTimeFormat(locale).format(new Date(slot.date))}</p>
            <p><strong>{t('editPatientDialog.timeLabel')}</strong> {slot.time}</p>
          </div>
        </Card>

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="edit-name" className="text-sm font-medium">
              {t('editPatientDialog.patientName')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder={t('editPatientDialog.placeholders.name')}
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <Label htmlFor="edit-phone" className="text-sm font-medium">
              {t('editPatientDialog.phone')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="edit-phone"
              value={formData.phone}
              onChange={handlePhoneChange}
              placeholder={t('editPatientDialog.placeholders.phone')}
              className={errors.phone ? "border-red-500" : ""}
            />
            {errors.phone && (
              <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
            )}
          </div>

          <div>
            <Label htmlFor="edit-age" className="text-sm font-medium">
              {t('editPatientDialog.age')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="edit-age"
              type="number"
              value={formData.age}
              onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
              placeholder={t('editPatientDialog.placeholders.age')}
              min="1"
              max="120"
              className={errors.age ? "border-red-500" : ""}
            />
            {errors.age && (
              <p className="text-red-500 text-xs mt-1">{errors.age}</p>
            )}
          </div>

          <div>
            <Label htmlFor="edit-gender" className="text-sm font-medium">
              {t('editPatientDialog.gender')} <span className="text-red-500">*</span>
            </Label>
            <Select value={formData.gender} onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}>
              <SelectTrigger className={errors.gender ? "border-red-500" : ""}>
                <SelectValue placeholder={t('editPatientDialog.placeholders.gender')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">{t('editPatientDialog.genderOptions.male')}</SelectItem>
                <SelectItem value="Female">{t('editPatientDialog.genderOptions.female')}</SelectItem>
                <SelectItem value="Other">{t('editPatientDialog.genderOptions.other')}</SelectItem>
              </SelectContent>
            </Select>
            {errors.gender && (
              <p className="text-red-500 text-xs mt-1">{errors.gender}</p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              {t('editPatientDialog.cancel')}
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-healthcare-primary hover:bg-healthcare-primary/90"
            >
              {t('editPatientDialog.update')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};