import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  className?: string;
}

export const NumberField: React.FC<NumberFieldProps> = ({
  label,
  value,
  onChange,
  min = 0,
  max = 1000,
  step = 1,
  unit = 'px',
  className = '',
}) => {
  return (
    <div className={`space-y-1 ${className}`}>
      <Label className="text-xs font-medium text-gray-700">
        {label} {unit && `(${unit})`}
      </Label>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="h-8 text-sm"
      />
    </div>
  );
};
