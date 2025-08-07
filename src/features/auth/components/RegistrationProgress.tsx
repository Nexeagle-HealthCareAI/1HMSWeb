import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface RegistrationProgressProps {
  currentStep: number;
  onBack?: () => void;
}

export const RegistrationProgress: React.FC<RegistrationProgressProps> = ({
  currentStep,
  onBack
}) => {
  const totalSteps = 3;
  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <div className="flex items-center justify-between mb-6">
      {/* Back Button */}
      <div className="flex items-center">
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="p-2 h-auto text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Logo */}
      <div className="flex-1 flex justify-center">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          {/* Bird/Medical Cross Logo */}
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/>
            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z"/>
          </svg>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-600">
          Step {currentStep} of {totalSteps}
        </span>
        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-300 ease-in-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}; 