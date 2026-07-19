import React, { useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { Image as ImageIcon, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LowBandwidthImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackIconSize?: number;
}

export const LowBandwidthImage: React.FC<LowBandwidthImageProps> = ({ 
  src, 
  alt, 
  className,
  fallbackIconSize = 24,
  ...props 
}) => {
  const { isLowBandwidthMode } = useAppStore();
  const [forceLoad, setForceLoad] = useState(false);
  const [error, setError] = useState(false);

  // If we're not in low bandwidth mode, or the user explicitly tapped to load, show normal image
  if (!isLowBandwidthMode || forceLoad) {
    if (error) {
      return (
        <div className={cn("flex flex-col items-center justify-center bg-muted text-muted-foreground border rounded-md p-4", className)}>
          <ImageIcon size={fallbackIconSize} className="mb-2 opacity-50" />
          <span className="text-xs text-center opacity-70">Image failed to load</span>
        </div>
      );
    }

    return (
      <img 
        src={src} 
        alt={alt || "Image"} 
        className={className}
        onError={() => setError(true)}
        {...props} 
      />
    );
  }

  // Low bandwidth placeholder
  return (
    <div 
      className={cn(
        "flex flex-col items-center justify-center bg-muted/50 border border-dashed rounded-md p-4 cursor-pointer hover:bg-muted transition-colors", 
        className
      )}
      onClick={() => setForceLoad(true)}
      title="Tap to load image (Data Saver Mode)"
    >
      <Download size={fallbackIconSize} className="mb-2 text-muted-foreground/70" />
      <span className="text-xs text-center text-muted-foreground/80 font-medium">Tap to load image</span>
    </div>
  );
};
