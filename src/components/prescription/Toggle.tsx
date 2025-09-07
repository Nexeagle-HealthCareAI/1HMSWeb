import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface ToggleProps {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  description?: string;
  className?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
  label,
  checked,
  onCheckedChange,
  description,
  className = '',
}) => {
  return (
    <div className={`flex items-center justify-between space-x-2 ${className}`}>
      <div className="space-y-1">
        <Label className="text-xs font-medium text-gray-700">{label}</Label>
        {description && (
          <p className="text-xs text-gray-500">{description}</p>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
};
