import React from 'react';
import { clamp } from '../../utils/mm';

interface NumberMmProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  placeholder?: string;
}

export const NumberMm: React.FC<NumberMmProps> = ({
  value,
  onChange,
  min = 0,
  max = 1000,
  step = 1,
  className = "",
  placeholder
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value) || 0;
    const clampedValue = clamp(newValue, min, max);
    onChange(clampedValue);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value) || 0;
    const clampedValue = clamp(newValue, min, max);
    onChange(clampedValue);
  };

  return (
    <div className="relative">
      <input
        type="number"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        className={`w-full px-3 py-2 pr-8 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
      />
      <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400">
        mm
      </span>
    </div>
  );
};
