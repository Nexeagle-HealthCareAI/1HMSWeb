import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, X, Clock, Monitor } from 'lucide-react';

interface EyeFriendlyNotificationProps {
  className?: string;
}

export const EyeFriendlyNotification: React.FC<EyeFriendlyNotificationProps> = ({ className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [lastReminder, setLastReminder] = useState<number>(0);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());

  useEffect(() => {
    // Set session start time
    setSessionStartTime(Date.now());
    
    // Check for existing reminder time
    const savedReminder = localStorage.getItem('eye-care-last-reminder');
    if (savedReminder) {
      setLastReminder(parseInt(savedReminder));
    }

    // Check every 5 minutes for eye care reminders
    const interval = setInterval(() => {
      const now = Date.now();
      const sessionDuration = now - sessionStartTime;
      const timeSinceLastReminder = now - lastReminder;
      
      // Show reminder after 20 minutes of continuous use and every 30 minutes after that
      if (sessionDuration > 20 * 60 * 1000 && timeSinceLastReminder > 30 * 60 * 1000) {
        setIsVisible(true);
        setLastReminder(now);
        localStorage.setItem('eye-care-last-reminder', now.toString());
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(interval);
  }, [sessionStartTime, lastReminder]);

  const handleDismiss = () => {
    setIsVisible(false);
  };

  const handleTakeBreak = () => {
    setIsVisible(false);
    // Could trigger a break timer or redirect to a break page
    window.open('https://www.20-20-20-rule.com/', '_blank');
  };

  if (!isVisible) return null;

  return (
    <div className={`fixed bottom-4 right-4 z-50 max-w-sm ${className}`}>
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-700 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-full">
                <Eye className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                Eye Care Reminder
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-xs mb-3">
                You've been working for a while. Consider taking a short break to rest your eyes.
              </p>
              
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-3">
                <Clock className="h-3 w-3" />
                <span>Follow the 20-20-20 rule: Look 20 feet away for 20 seconds every 20 minutes</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleTakeBreak}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                >
                  Take Break
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EyeFriendlyNotification;
