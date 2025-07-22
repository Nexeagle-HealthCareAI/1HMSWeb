import React, { useState, useEffect } from 'react';
import { X, Lightbulb, ArrowRight, Star } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ContextualGuideProps {
  children: React.ReactNode;
  title: string;
  description: string;
  tips?: string[];
  placement?: 'top' | 'bottom' | 'left' | 'right';
  triggerMode?: 'hover' | 'click' | 'auto';
  id: string;
  showOnMount?: boolean;
  priority?: 'high' | 'medium' | 'low';
}

export const ContextualGuide: React.FC<ContextualGuideProps> = ({
  children,
  title,
  description,
  tips = [],
  placement = 'bottom',
  triggerMode = 'hover',
  id,
  showOnMount = false,
  priority = 'medium'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if this guide was previously dismissed
    const dismissed = localStorage.getItem(`guide-dismissed-${id}`);
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    // Auto show on mount if specified
    if (showOnMount && triggerMode === 'auto') {
      const timer = setTimeout(() => setIsOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [id, showOnMount, triggerMode]);

  const handleDismiss = () => {
    setIsOpen(false);
    setIsDismissed(true);
    localStorage.setItem(`guide-dismissed-${id}`, 'true');
  };

  const handleToggle = (open: boolean) => {
    if (isDismissed && !open) return;
    setIsOpen(open);
  };

  if (isDismissed) {
    return <>{children}</>;
  }

  const getPriorityColor = () => {
    switch (priority) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-blue-500';
      case 'low': return 'text-green-500';
      default: return 'text-blue-500';
    }
  };

  const getPriorityBg = () => {
    switch (priority) {
      case 'high': return 'bg-red-50 border-red-200';
      case 'medium': return 'bg-blue-50 border-blue-200';
      case 'low': return 'bg-green-50 border-green-200';
      default: return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={handleToggle}>
      <PopoverTrigger asChild>
        <div 
          className="relative inline-block w-full"
          onMouseEnter={() => triggerMode === 'hover' && !isDismissed && setIsOpen(true)}
          onMouseLeave={() => triggerMode === 'hover' && setIsOpen(false)}
          onClick={() => triggerMode === 'click' && !isDismissed && setIsOpen(!isOpen)}
        >
          {children}
        </div>
      </PopoverTrigger>
      
      <PopoverContent 
        side={placement} 
        className={`w-80 p-0 ${getPriorityBg()} border-2 shadow-lg`}
        sideOffset={8}
      >
        {/* Header */}
        <div className="p-4 pb-3 border-b border-current/20">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-full ${getPriorityColor().replace('text-', 'bg-')}/20`}>
                <Lightbulb className={`h-4 w-4 ${getPriorityColor()}`} />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-gray-900">{title}</h3>
                <Badge variant="outline" className="text-xs mt-1">
                  <Star className="h-3 w-3 mr-1" />
                  Quick Tip
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-6 w-6 p-0 hover:bg-gray-200/50 rounded-full"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <p className="text-sm text-gray-700 leading-relaxed">
            {description}
          </p>

          {/* Tips */}
          {tips.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-xs text-gray-600 uppercase tracking-wide">
                💡 Pro Tips
              </h4>
              <ul className="space-y-1.5">
                {tips.map((tip, index) => (
                  <li key={index} className="flex items-start gap-2 text-xs text-gray-600">
                    <ArrowRight className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center pt-2 border-t border-current/10">
            <span className="text-xs text-gray-500">Click anywhere to close</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="text-xs h-6 px-2 hover:bg-gray-200/50"
            >
              Got it! ✨
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};