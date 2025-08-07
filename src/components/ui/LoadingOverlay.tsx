import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  isLoading, 
  message = "Signing you in..." 
}) => {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop with blur effect */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      
      {/* Loading content */}
      <div className="relative bg-card border rounded-lg shadow-lg p-6 flex flex-col items-center space-y-4 min-w-[200px]">
        {/* Spinner */}
        <div className="relative">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        
        {/* Message */}
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">{message}</p>
          <p className="text-xs text-muted-foreground mt-1">Please wait...</p>
        </div>
      </div>
    </div>
  );
};
