import React from 'react';

interface FieldProps {
  label: string;
  children: React.ReactNode;
  error?: string;
  className?: string;
}

export const Field: React.FC<FieldProps> = ({ label, children, error, className = "" }) => {
  return (
    <div className={`space-y-1 ${className}`}>
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      {children}
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
};
