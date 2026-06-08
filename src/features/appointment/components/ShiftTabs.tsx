import React from 'react';
import { useTranslation } from 'react-i18next';
import { Sunrise, Sun, Sunset, Moon } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { cn } from '@/lib/utils';

interface ShiftTabsProps {
  selectedShift: string;
  onShiftSelect: (shift: string) => void;
}

const shifts = [
  {
    id: 'morning',
    nameKey: 'shiftTabs.shifts.morning.name',
    timeKey: 'shiftTabs.shifts.morning.time',
    icon: Sunrise,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50 border-orange-200'
  },
  {
    id: 'afternoon',
    nameKey: 'shiftTabs.shifts.afternoon.name',
    timeKey: 'shiftTabs.shifts.afternoon.time',
    icon: Sun,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50 border-yellow-200'
  },
  {
    id: 'evening',
    nameKey: 'shiftTabs.shifts.evening.name',
    timeKey: 'shiftTabs.shifts.evening.time',
    icon: Sunset,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 border-orange-300'
  },
  {
    id: 'night',
    nameKey: 'shiftTabs.shifts.night.name',
    timeKey: 'shiftTabs.shifts.night.time',
    icon: Moon,
    color: 'text-brand-600',
    bgColor: 'bg-brand-50 border-brand-200'
  }
];

export const ShiftTabs: React.FC<ShiftTabsProps> = ({
  selectedShift,
  onShiftSelect
}) => {
  const { t } = useTranslation();

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        {t('shiftTabs.title')}
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {shifts.map((shift) => {
          const Icon = shift.icon;
          const isSelected = selectedShift === shift.id;
          
          return (
            <Card
              key={shift.id}
              className={cn(
                "p-4 cursor-pointer transition-all duration-200 hover:shadow-md border-2",
                isSelected 
                  ? "border-healthcare-primary bg-slot-selected shadow-md" 
                  : "border-border hover:border-healthcare-primary/50",
                shift.bgColor
              )}
              onClick={() => onShiftSelect(shift.id)}
            >
              <div className="text-center space-y-2">
                <Icon className={cn(
                  "h-8 w-8 mx-auto",
                  isSelected ? "text-healthcare-primary" : shift.color
                )} />
                <div>
                  <h4 className={cn(
                    "font-semibold text-sm",
                    isSelected ? "text-healthcare-primary" : "text-foreground"
                  )}>
                    {t(shift.nameKey)}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {t(shift.timeKey)}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};